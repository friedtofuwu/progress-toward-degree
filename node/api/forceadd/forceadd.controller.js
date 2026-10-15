const Log = require("../../database/utils/Log");
const { addForceAdd, getForceAddsForAdvisorTable, getForceAddsForStudentTable, getForceAddForAdvisor, getForceAddForStudent, updateStatus, updateComments, ForceAdd, getAcademicLevels } = require("../../database/utils/ForceAdd");
const { addFAFiles, getFAFiles, getFAFileWOwner, getFAFile } = require("../../database/utils/FAFiles");
const { getCurrentUser } = require("../helpers");
const {forceAddApprovedEmail, forceAddSoftDenyEmail, forceAddSubmittedEmail, forceAddCanceledEmail} = require("../../helpers/emailer");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const faPath = "/tmp/p91-tool/fa";
const fs = require('fs');
const path = require("path");

//File upload
module.exports.uploadPath = "/stash/force-add";

module.exports.newForceAdd = async (req, res) => {
    Log.info(`Received ForceAdd submission`, getCurrentUser(res)?.pid);

    //Validate the Request
    if(!req.body) {
        Log.warn(`Error with ForceAdd Submission: request body is empty.`, getCurrentUser(res)?.pid);
        return res.status(400).send({
            message: "Submission can not be empty"
        })
    } else if(!req.body.degree) {
        Log.warn(`Error with ForceAdd Submission: request body does not contain degree`, getCurrentUser(res)?.pid);
        return res.status(400).send({
            message: "Must supply degree"
        });
    } else if(!req.body.major) {
        Log.warn(`Error with ForceAdd Submission: request body does not contain major`, getCurrentUser(res)?.pid);
        return res.status(400).send({
            message: "Must supply major"
        });
    } else if(!req.body.grad_date) {
        Log.warn(`Error with ForceAdd Submission: request body does not contain graduation date`, getCurrentUser(res)?.pid);
        return res.status(400).send({
            message: "Must supply graduation date"
        });
    } else if(!req.body.campus) {
        Log.warn(`Error with ForceAdd Submission: request body does not contain campus`, getCurrentUser(res)?.pid);
        return res.status(400).send({
            message: "Must supply campus"
        });
    } else if(!req.body.term) {
        Log.warn(`Error with ForceAdd Submission: request body does not contain term`, getCurrentUser(res)?.pid);
        return res.status(400).send({
            message: "Must supply term"
        });
    } else if(!req.body.course) {
        Log.warn(`Error with ForceAdd Submission: request body does not contain course`, getCurrentUser(res)?.pid);
        return res.status(400).send({
            message: "Must supply course"
        });
    } else  if(!req.body.reason) {
        Log.warn(`Error with ForceAdd Submission: request body does not contain reason`, getCurrentUser(res)?.pid);
        return res.status(400).send({
            message: "Must supply reason"
        });
    }

    //Make a call to get the additional student info based on the users PID
    //Could do this on the frontend to have the user verify the info? But also opens up to user submitting false data
    let pid = getCurrentUser(res).pid || "Unknown";
    let id_number = "000000000";
    let banner_name = "Unknown"
    let academic_level = "Unknown"
    let banner_major = "Unknown"
    let banner_campus = "Unknown"
    let minor = req.body.minor || null;
    //Handle the timestamp
    let submission_time = getTimeStamp();

    //Get the submitters banner information
    Log.info(`Checking Banner information for ${pid}`, getCurrentUser(res)?.pid);
    let banner = await getBannerInfo(pid,req.app.locals.pem);
    if(Object.keys(banner).length > 0) {
        //Assemble the banner name, if it exists
        banner.names.forEach(n => {
            if(n.type == 'BANNER') {
                banner_name = n.first;
                if(typeof(banner_name.middle) == "string" && banner_name.middle !== "null")
                    banner_name += " "+n.middle;
                banner_name += " "+n.last;
            }
        });
        banner_major = banner?.studentData?.majorCode || "Unknown";
        banner_campus = banner?.studentData?.campus || "Unknown";
        id_number = banner?.virginiaTechId || "000000000";
        academic_level = banner?.studentData?.classLevel || "Unknown";
    }
    addForceAdd(
        pid, parseInt(id_number),
        banner_name, banner_major, banner_campus, academic_level,
        req.body.degree, req.body.major, minor, parseInt(req.body.campus), req.body.grad_date,
        parseInt(req.body.term), req.body.course,
        parseInt(req.body.first_choice) || null, parseInt(req.body.second_choice) || null,
        req.body.drops || "", parseInt(req.body.reason), req.body.comments, submission_time, 0, submission_time
    ).then((resp) => {
        Log.info(`Accepted Force Add Submission ${resp.result.insertId}`, getCurrentUser(res)?.pid);
        /* Handle uploaded files */
        //Files have assumedly already been uploaded by multer, so they just need to be added to the db
        //Later may be wise to organize them by forceadd_id for ease of removing miscellaneous and outdated
        var file_inputs = [];
        for (let i = 0; i < req.files.length; i++) {
            file_inputs.push({forceadd_id:resp.result.insertId, file_name:req.files[i].filename})
        }
        addFAFiles(file_inputs).then((response) => {
            Log.info(`Added FAFiles for Force Add ${resp.result.insertId}`);
            //Send submission email
            forceAddSubmittedEmail(resp.result.insertId).then(() => {
                res.sendStatus(200);
            }).catch((err) => {
                Log.error(`Failed to send submission email for ForceAdd ${req.params.key}: ${err}`, getCurrentUser(res).pid);
                res.status(500).send({
                    message: "The request was successfully submitted, but some error occured while sending email notifications"
                })
            })
        }).catch((err) => {
            Log.error(`Failed to accept force add files for submission ${req.params.key}: ${err}`, getCurrentUser(res)?.pid);
            res.status(500).send({
                message: "Some error occured while processing your Force Add Submissions Files"
            });
        })
    }).catch((err) => {
        Log.error(`Failed to accept force add submission: ${err}`, getCurrentUser(res)?.pid);
        res.status(500).send({
            message: "Some error occured while processing your Force Add Submission"
        });
    })
}

/** Takes the request and returns the needed filter, sort, and sort_dir */
getForceAddsHelper = (req) => {
    console.log(`req.query: ${JSON.stringify(req.query)}`);
    let filter = {};
    if(req.query.term) {
        if(Array.isArray(req.query.term)) {
            filter.term = []
            req.query.term.forEach(element => {
                filter.term.push(parseInt(element))
            });
        } else {
            filter.term = [parseInt(req.query.term)];
        }
    }
    if(req.query.status) {
        console.log(`${req.query.status}: ${JSON.stringify(req.query.status)}`);
        if(Array.isArray(req.query.status)) {
            filter.status = []
            req.query.status.forEach(element => {
                filter.status.push(parseInt(element))
            });
        } else {
            filter.status = [parseInt(req.query.status)];
        }
    }
    if(req.query.degree) {
        if(Array.isArray(req.query.degree)) {
            filter.degree = []
            req.query.degree.forEach(element => {
                filter.degree.push(element)
            });
        } else {
            filter.degree = [req.query.degree];
        }
    }
    if(req.query.alvl) {
        if(Array.isArray(req.query.alvl)) {
            filter.academic_level = []
            req.query.alvl.forEach(element => {
                filter.academic_level.push(element)
            });
        } else {
            filter.academic_level = [req.query.alvl];
        }
    }
    if(req.query.major) {
        if(Array.isArray(req.query.major)) {
            filter.major = []
            req.query.major.forEach(element => {
                filter.major.push(element)
            });
        } else {
            filter.major = [req.query.major];
        }
    }
    if(req.query.campus) {
        if(Array.isArray(req.query.campus)) {
            filter.campus = []
            req.query.campus.forEach(element => {
                filter.campus.push(parseInt(element))
            });
        } else {
            filter.campus = [parseInt(req.query.campus)];
        }
    }
    if(req.query.pid) {
        filter.pid = [req.query.pid];
    }
    if(req.query.course_id) {
        filter.course_id = [req.query.course_id];
    }
    if(req.query.crn) {
        filter.crn = [req.query.crn];
    }
    if(req.query.name) {
        filter.name = [req.query.name];
    }
    console.log(`Filter = ${JSON.stringify(filter)}`)
    //Double check for sort
    let sort = [];
    if(req.query.sort1)
        sort.push(req.query.sort1);
    else
        sort.push("submission_timestamp");
    if(req.query.sort2)
        sort.push(req.query.sort2);
    let sort_dir = req.query.sortdir || "ASC"; //default to ascending sort
    return [filter, sort, sort_dir];
}

module.exports.getForceAddsTable = (req, res) => {
    if(getCurrentUser(res).permissions & 3 > 0) { //Advisor or Admin
        Log.info(`Received request to get ForceAdds for Advisors Table`, getCurrentUser(res)?.pid);
        //Get the filter, sort, and direction
        let [filter, sort, sort_dir] = getForceAddsHelper(req);
        //Get the Force Adds for the table
        getForceAddsForAdvisorTable(
            filter, sort, sort_dir
        ).then((result) => {
            Log.info(`Successfully got ForceAdds for Advisor Table`, getCurrentUser(res).pid);
            res.status(200).json({
                forceadds: result.map((fa) => fa.toJSON())
            });
        }).catch((err) => {
            Log.error(`Error getting ForceAdds for Advisor Table: ${err}`,getCurrentUser(res).pid);
            return res.status(404).send({
                message: `Error getting ForceAdds.`
            });
        })
    } else { //Assumedly a student who only has access to their own requests
        Log.info(`Received request to get ForceAdds for Students Table`, getCurrentUser(res)?.pid);
        //Generate the filter
        let filter = {};
        if(req.query.term)
            filter.term = parseInt(req.query.term);
        if(req.query.status)
            filter.status = parseInt(req.query.status);
        //ENSURE the students PID is a filter and overwrite in case they're trying to get someone elses
        filter.pid = getCurrentUser(res).pid;
        //Double check for sort
        let sort = req.query.sort || "submission_timestamp"; //default to submission timestamp
        let sort_dir = req.query.sortdir || "ASC"; //default to ascending sort
        //Get the Force Adds for the table
        getForceAddsForStudentTable(
            filter, sort, sort_dir
        ).then((result) => {
            Log.info(`Successfully got ForceAdds for Student Table`, getCurrentUser(res).pid);
            res.status(200).json({
                forceadds: result.map((fa) => fa.toJSON())
            });
        }).catch((err) => {
            Log.error(`Error getting ForceAdds for Advisor Table: ${err}`, getCurrentUser(res).pid);
            return res.status(404).send({
                message: `Error getting ForceAdds.`
            });
        })
    }
}

module.exports.ForceAddsCSV = (req, res) => {
    Log.info(`Received request to get ForceAdds CSV`, getCurrentUser(res)?.pid);
    //Get the filter, sort, and direction
    let [filter, sort, sort_dir] = getForceAddsHelper(req);
    //Get the Force Adds for the table
    getForceAddsForAdvisorTable(
        filter, sort, sort_dir
    ).then((forceadds) => {

        if(!fs.existsSync(faPath)) //Ensure the path exists or create
            fs.mkdirSync(faPath);
        const faFileName = `${faPath}/fa-${Date.now()}.csv`;
        Log.info(`Creating ForceAdds CSV: ${faFileName}.`, getCurrentUser(res)?.pid);
        //Create a write stream
        const faStream = fs.createWriteStream(faFileName, {flags: 'a'});
        //Add headers
        let faHeaders = "forceadd_id,pid,id_number,banner_name,banner_major,banner_campus,academic_level,degree,major,minor,campus,grad_date,term,course_id,first_choice,second_choice,drops,reason,student_comment,submission_timestamp,status,status_timestamp,internal_comments,external_comments,emailed";
        faStream.write(faHeaders + "\n");
        //Add body
        forceadds.forEach((forceadd) => {
            const faString = [
                forceadd.forceadd_id,
                "\""+forceadd.pid.replaceAll("\"","\"\"")+"\"",
                forceadd.id_number,
                "\""+forceadd.banner_name.replaceAll("\"","\"\"")+"\"",
                "\""+forceadd.banner_major.replaceAll("\"","\"\"")+"\"",
                "\""+forceadd.banner_campus.replaceAll("\"","\"\"")+"\"",
                "\""+forceadd.academic_level.replaceAll("\"","\"\"")+"\"",
                "\""+forceadd.degree.replaceAll("\"","\"\"")+"\"",
                "\""+forceadd.major.replaceAll("\"","\"\"")+"\"",
                forceadd.minor ? "\""+forceadd.minor.replaceAll("\"","\"\"")+"\"" : "",
                forceadd.campus,
                forceadd.grad_date,
                forceadd.term,
                forceadd.course_id,
                forceadd.first_choice,
                forceadd.second_choice,
                "\""+forceadd.drops.replaceAll("\"","\"\"")+"\"",
                forceadd.reason == 0 ? "\"D3AD B33F\"":
                forceadd.reason == 1 ? "\"You are a current CS/DCC/SC major or CS/HCI minor, AND your major/minor is included in the class restrictions, but you cannot register.\"":
                forceadd.reason == 2 ? "\"Graduate student attempting to add an undergraduate course and have received direction from the CS Department to submit this request. Please add details in the comment box.\"":
                forceadd.reason == 3 ? "\"You did not earn a C or better in a CS course in the prior semester and need to repeat the course.\"":
                forceadd.reason == 4 ? "\"You took an approved alternate course and are approved to override the prerequisite(s) in CS 4824 or CS 3654 (these are the ONLY courses with approved overrides).\"":
                forceadd.reason == 5 ? "\"You want to enroll in CS 3984, 3894, 4894 or 4984, and cannot as these courses require force/adding to enroll.\"":
                forceadd.reason == 6 ? "\"Only select this option if you were instructed by your CS major or minor advisor to submit this request. Please include details in the comment box below.\"":
                forceadd.reason == 13 ? "\"You have completed an approved alternate prerequisite but cannot register (ex: Took ECE 2514 in place of CS 1114).\"":
                forceadd.reason == 7 ? "\"Prerequisites were completed outside of VT and your student record hasn't been updated.\"":
                forceadd.reason == 8 ? "\"The course is restricted by major, but the course is required for your major, minor, degree, or graduate certificate.\"":
                forceadd.reason == 9 ? "\"The course is restricted by major, but you are a prospective student or Commonwealth Campus student.\"":
                forceadd.reason == 10 ? "\"The course requires department or faculty approval.\"":
                forceadd.reason == 11 ? "\"Currently retaking a prerequisite.\"":
                forceadd.reason == 12 ? "\"I am an Accelerated MS/MEng 4+1 student.\"":
                "\"Other\"",
                "\""+forceadd.student_comment.replaceAll("\"","\"\"")+"\"",
                "\""+forceadd.submission_timestamp+"\"",
//                "\""+readableTimeStamp(forceadd.submission_timestamp)+"\"",
                forceadd.status == 0 ? "\"Pending Review\"" :
                forceadd.status == 1 ? "\"Approved\"" :
                forceadd.status == 2 ? "\"Wait Listed\"" :
                forceadd.status == 3 ? "\"Denied - Other (Resubmission Allowed)\"" :
                forceadd.status == 4 ? "\"Denied - Other (Resubmission Not Allowed)\"" :
                forceadd.status == 5 ? "\"Denied - Missing Prerequisite (Resubmission Not Allowed)\"" :
                forceadd.status == 6 ? "\"Denied - Class Full (Resubmission Not Allowed)\"" :
                forceadd.status == 32 ? "\"Cancelled\"" : "\"D3AD B33F\"",
                "\""+forceadd.status_timestamp+"\"",
//                "\""+readableTimeStamp(forceadd.status_timestamp)+"\"",
                "\""+forceadd.internal_comments.replaceAll("\"","\"\"")+"\"",
                "\""+forceadd.external_comments.replaceAll("\"","\"\"")+"\"",
                forceadd.emailed,
            ]
            faStream.write(faString.join() + "\n");
        })
        faStream.end()
        faStream.on('finish', () => {
            Log.info("ForceAdds CSV Created.", getCurrentUser(res)?.pid);
            //Send file
            return res.download(faFileName, (err) => {
                if(err) {
                    Log.error("Error downloading ForceAdds CSV:", getCurrentUser(res)?.pid, err);
                } else {
                    Log.info('ForceAdds CSV Downloaded.', getCurrentUser(res)?.pid);
                }
                //Delete the file
                fs.unlink(faFileName, (err) => {
                    if(err)
                        Log.error('Error Deleting ForceAdds CSV:', getCurrentUser(res)?.pid, err)
                    else
                        Log.info('ForceAdds CSV Deleted.', getCurrentUser(res)?.pid);
                });
            });
        })
        .on('error', (err) => {
            Log.error('Error Creating ForceAdds CSV:',getCurrentUser(res)?.pid, err);
            res.status(500).send({
                message: err.message || "Error Creating ForceAdds CSV"
            });
        });
    }).catch((err) => {
        Log.error(`Error getting ForceAdds for ForceAdds CSV: ${err}`,getCurrentUser(res).pid);
        return res.status(404).send({
            message: `Error Getting ForceAdds.`
        });
    })
}

module.exports.getForceAdd = (req, res) => {
    if(getCurrentUser(res).permissions & 3 > 0) { //Advisor or Admin
        Log.info(`Receieved request to get Force Add Submission by Admin`, getCurrentUser(res).pid);
        if(!req.params.key) {
            Log.warn(`Error with getting Force Add Submission: no key given`, getCurrentUser(res).pid);
            return res.status(400).send({
                message: "Must supply key"
            });
        }
        const key = parseInt(req.params.key);
        getForceAddForAdvisor(
            key
        ).then((result) => {
            if(!result) {
                Log.info(`Could not find Force Add Submission of ${key}`, getCurrentUser(res).pid);
                return res.status(404).send({
                    message: `Force Add Submission not found with key ${key}`
                });
            }
            Log.info(`Successfully got Force Add Submission of ${key}`, getCurrentUser(res).pid);
            res.status(200).send({ forceadd: result });
        }).catch((err) => {
            Log.error(`Error getting Force Add Submission of ${key}: ${err}`,getCurrentUser(res).pid);
            return res.status(404).send({
                message: `Error getting Force Add Submission of ${key}`
            });
        })
    } else { //Assumedly student who only has access to their own requests
        Log.info(`Receieved request to get Force Add Submission by Student`, getCurrentUser(res).pid);
        if(!req.params.key) {
            Log.warn(`Error with getting Force Add Submission: no key given`, getCurrentUser(res).pid);
            return res.status(400).send({
                message: "Must supply key"
            });
        }
        const key = parseInt(req.params.key);
        getForceAddForStudent(
            key, getCurrentUser(res).pid
        ).then((result) => {
            if(!result) {
                Log.info(`Could not find Force Add Submission of ${key}, may not have belonged to user`, getCurrentUser(res).pid);
                return res.status(404).send({
                    message: `Force Add Submission not found with key ${key}`
                });
            }
            Log.info(`Successfully got Force Add Submission of ${key}`, getCurrentUser(res).pid);
            res.status(200).send({ forceadd: result });
        }).catch((err) => {
            Log.error(`Error getting Force Add Submission of ${key}: ${err}`,getCurrentUser(res).pid);
            return res.status(404).send({
                message: `Error getting Force Add Submission of ${key}`
            });
        })
    }
}

module.exports.updateComments = (req, res) => {
    Log.info(`Received ForceAdd Comments Changes`, getCurrentUser(res)?.pid);

    //Validate the Request
    if(!req.params.key) {
        Log.warn(`Error with ForceAdd Status Change: no key given`, getCurrentUser(res).pid);
        return res.status(400).send({
            message: "Must supply key"
        });
    }
    console.log("Params:"+JSON.stringify(req.params));
    try {
        console.log("Full Request:"+JSON.stringify(req));
    } catch {
        console.log("Cannot stringify a request")
    }
    if(!req.body) {
        Log.warn(`Error with ForceAdd Comments Change: request body is empty.`, getCurrentUser(res)?.pid);
        return res.status(400).send({
            message: "Submission can not be empty"
        })
    }
    let internal_comments = req.body?.internal || "";
    let external_comments = req.body?.external || "";
    //Ensure max length of comments
    if(external_comments.length > 255) {
        Log.warn(`Error with ForceAdd Comments Change: external comments greater than 255 characters`, getCurrentUser(res)?.pid);
        return res.status(400).send({
            message: "External Comments must be 255 characters or less"
        });
    } else if(internal_comments.length > 255) {
        Log.warn(`Error with ForceAdd Comments Change: internal comments greater than 255 characters`, getCurrentUser(res)?.pid);
        return res.status(400).send({
            message: "Internal Comments must be 255 characters or less"
        });
    }
    
    updateComments(
        req.params.key, internal_comments, external_comments
    ).then(() => {
        Log.info(`Accepted ForceAdd Comments Change`, getCurrentUser(res)?.pid);
        res.sendStatus(200);
    }).catch((err) => {
        Log.error(`Failed to accept ForceAdd Comments Change: ${err}`, getCurrentUser(res)?.pid);
        res.status(500).send({
            message: "Some error occured while processing your ForceAdd Comments Change"
        });
    })
}

module.exports.updateStatus = (req, res) => {
    Log.info(`Received ForceAdd Status Changes`, getCurrentUser(res)?.pid);
    //Validate the Request
    if(!req.params.key) {
        Log.warn(`Error with ForceAdd Status Change: no key given`, getCurrentUser(res).pid);
        return res.status(400).send({
            message: "Must supply key"
        });
    }
    if(!req.body) {
        Log.warn(`Error with ForceAdd Status Change: request body is empty.`, getCurrentUser(res)?.pid);
        return res.status(400).send({
            message: "Submission can not be empty"
        })
    } else if(!req.body.newstatus) {
        Log.warn(`Error with ForceAdd Status Change: request body does not contain status`, getCurrentUser(res)?.pid);
        return res.status(400).send({
            message: "Must supply status"
        });
    }
    const key = req.params.key;
    const newstatus = parseInt(req.body.newstatus)
    let statustime = getTimeStamp();
    let emailed = 1;
    if(
        parseInt(newstatus) == 2 || parseInt(newstatus) == 4 ||
        parseInt(newstatus) == 5 || parseInt(newstatus) == 6
    ) {//Waitlisted or Hard Denied
        emailed = 0;
    }
    updateStatus(
        key, newstatus, statustime, emailed
    ).then(() => {
        Log.info(`Accepted ForceAdd Status Change`, getCurrentUser(res)?.pid);
        //Send email notifications based on status
        console.log(`key: ${key}, newstatus: ${newstatus}`);
        if(newstatus == 1) { //Approved
            forceAddApprovedEmail(key).then(() =>
                res.sendStatus(200)
            ).catch((err) => {
                Log.error(`Failed to send approval email for ForceAdd ${key}: ${err}`, getCurrentUser(res).pid);
                return res.status(500).send({
                    message: "The request was successfully approved, but some error occured while sending email notifications"
                })
            })
        } else if(newstatus == 3) { //Denied w/ resubmission
            forceAddSoftDenyEmail(key).then(() => 
                res.sendStatus(200)
            ).catch((err) => {
                Log.error(`Failed to send soft denial email for ForceAdd ${key}: ${err}`, getCurrentUser(res).pid);
                return res.status(500).send({
                    message: "The request was successfully soft denied, but some error occured while sending email notifications"
                })
            })
        } else if(newstatus == 32) { //Cancelled
            forceAddCanceledEmail(key).then(() => 
                res.sendStatus(200)
            ).catch((err) => {
                Log.error(`Failed to send cancelled email for ForceAdd ${key}: ${err}`, getCurrentUser(res).pid);
                return res.status(500).send({
                    message: "The request was successfully cancelled, but some error occured while sending email notifications"
                })
            })
        } else //Delayed responses...
            res.sendStatus(200)
    }, key, newstatus).catch((err) => {
        Log.error(`Failed to accept ForceAdd Status Change: ${err}`, getCurrentUser(res)?.pid);
        return res.status(500).send({
            message: "Some error occured while processing your ForceAdd Status Change"
        });
    })
}

module.exports.cancelForceAdd = (req, res) => {
    Log.info(`Received ForceAdd Cancellation`, getCurrentUser(res)?.pid);
    //Validate the request
    if(!req.params.key) {
        Log.warn(`Error with ForceAdd Cancellation: no key given`, getCurrentUser(res).pid);
        return res.status(400).send({
            message: "Must supply key"
        });
    }
    const key = parseInt(req.params.key);
    //Check if user has access to the forceadd
    if(getCurrentUser(res).permissions & 3 > 0) { //Admin OR Advisor
        let statustime = getTimeStamp();
        updateStatus(
            req.params.key, 32, statustime, 1
        ).then(() => {
            Log.info(`Cancelled ForceAdd ${key}`, getCurrentUser(res)?.pid);
            forceAddCanceledEmail(key).then(() => {
                res.sendStatus(200);
            }).catch((err) => {
                Log.error(`Failed to send cancellation email for ForceAdd ${key}: ${err}`, getCurrentUser(res).pid);
                return res.status(500).send({
                    message: "The request was successfully cancelled, but some error occured while sending email notifications"
                })
            })
        }, key).catch((err) => {
            Log.error(`Failed to Cancel ForceAdd ${req.params.key}: ${err}`, getCurrentUser(res)?.pid);
            return res.status(500).send({
                message: "Some error occured while Cancelling the ForceAdd"
            });
        })
    } else { //Student so need to check ownership
        getForceAddForStudent(
            key, getCurrentUser(res).pid
        ).then((result) => {
            if(!result) {
                Log.info(`Could not find Force Add Submission of ${key}, may not have belonged to user`, getCurrentUser(res).pid);
                return res.status(404).send({
                    message: `Force Add Submission not found with key ${key}`
                });
            } //Student owns forceadd
            //let statustime = new Date().toISOString().slice(0,19).replace('T',' ');
            let statustime = getTimeStamp();
            updateStatus(
                key, 32, statustime, 1
            ).then(() => {
                Log.info(`Cancelled ForceAdd ${key}`, getCurrentUser(res)?.pid);
                forceAddCanceledEmail(key).then(() => {
                    res.sendStatus(200);
                }).catch((err) => {
                    Log.error(`Failed to send cancellation email for ForceAdd ${key}: ${err}`, getCurrentUser(res).pid);
                    return res.status(500).send({
                        message: "Your request was successfully cancelled, but some error occured while sending email notifications"
                    })
                })
            }, key).catch((err) => {
                Log.error(`Failed to Cancel ForceAdd ${key}: ${err}`, getCurrentUser(res)?.pid);
                return res.status(500).send({
                    message: "Some error occured while Cancelling your ForceAdd"
                });
            })
        }, key).catch((err) => {
            Log.error(`Failed to Cancel ForceAdd ${req.params.key}: ${err}`, getCurrentUser(res)?.pid);
            return res.status(500).send({
                message: "Some error occured while Cancelling your ForceAdd"
            });
        })
    }
}

module.exports.getAcademicLevels = (req, res) => {
    getAcademicLevels().then((result) => {
        if(!result) {
            Log.info(`Could not get list of Academic Levels`, getCurrentUser(res).pid);
            return res.status(404).send({
                message: `No Academic Levels Found`
            });
        }
        Log.info(`Successfully got list of Academic Levels`, getCurrentUser(res).pid);
        res.status(200).send({ academic_levels: result });
    }).catch((err) => {
        Log.error(`Error getting list of Academic Levels: ${err}`,getCurrentUser(res).pid);
        return res.status(404).send({
            message: `Error getting list of Academic Levels`
        });
    })
}

module.exports.getFAFiles = (req, res) => {
    Log.info(`Receieved request to get List of Force Add Files`, getCurrentUser(res).pid);
    if(!req.params.key) {
        Log.warn(`Error with getting List of Force Add Files: no key given`, getCurrentUser(res).pid);
        return res.status(400).send({
            message: "Must supply key"
        });
    }
    const key = parseInt(req.params.key);
    getForceAddForAdvisor(
        key
    ).then((result) => {
        if(!result) {
            Log.info(`Could not find Force Add ${key}`, getCurrentUser(res).pid);
            return res.status(404).send({
                message: `Force Add not found with key ${key}`
            });
        }
        if( //Ensure user actually has access to this info
            getCurrentUser(res).permissions & 3 > 0 || //Advisor or Admin
            getCurrentUser(res).pid == result.pid //Submitter
        ) {
            //Get the list of files to return
            getFAFiles(key).then((result) => {
                Log.info(`Successfully got List of Force Add Files for ${key}`, getCurrentUser(res).pid);
                res.status(200).send({ files: result });
            })
        } else {
            Log.warn(`User does not have access to Force Add ${key}`, getCurrentUser(res).pid);
            return res.status(404).send({
                message: `Force Add not found with key ${key}`
            });
        }
    }).catch((err) => {
        Log.error(`Error getting List of Force Add Files for ${key}: ${err}`,getCurrentUser(res).pid);
        return res.status(404).send({
            message: `Error getting List of Force Add Files for ${key}`
        });
    })
}

module.exports.getFAFile = (req, res) => {
    Log.info(`Receieved request to get Force Add File`, getCurrentUser(res).pid);
    if(!req.params.key) {
        Log.warn(`Error with getting Force Add File: no key given`, getCurrentUser(res).pid);
        return res.status(400).send({
            message: "Must supply key"
        });
    }
    const key = parseInt(req.params.key);
    getFAFileWOwner(key).then((result) => {
        if(!result) {
            Log.info(`Could not find Force Add File ${key}`, getCurrentUser(res).pid);
            return res.status(404).send({
                message: `Force Add File not found with key ${key}`
            });
        }
        console.log(`[DEBUG] getFAFileWOwner(${key}) = ${JSON.stringify(result)}`)
        const file = result[0];
        console.log(`[DEBUG] file = ${JSON.stringify(file)}`)
        console.log(`[DEBUG] file => ${typeof file}`)
        if( //Ensure user actually has access to this info
            getCurrentUser(res).permissions & 3 > 0 || //Advisor or Admin
            getCurrentUser(res).pid == file.pid //Submitter
        ) {
            //Return the file
            Log.info(`Successfully got Force Add File ${key}`, getCurrentUser(res).pid);
            console.log(`[DEBUG] file.file_name = ${file.file_name}`)
            //SendFile
            res.sendfile(path.join(this.uploadPath,file.file_name), (err) => {
                if(err) {
                    Log.error(`Error sending ForceAdd File ${key}: `, getCurrentUser(res).pid, err);
                }
                Log.info(`Sent ForceAdd File ${key}`, getCurrentUser(res).pid)
            })
            //res.status(200).send({ files: result });
        } else {
            Log.warn(`User does not have access to Force Add File ${key}`, getCurrentUser(res).pid);
            return res.status(404).send({
                message: `Force Add File not found with key ${key}`
            });
        }
    }).catch((err) => {
        Log.error(`Error getting Force Add File ${key}: ${err}`,getCurrentUser(res).pid);
        return res.status(404).send({
            message: `Error getting Force Add File ${key}`
        });
    })
}

module.exports.test = (req, res) => {
    console.log(req.query);
    return res.status(200).send(req.query);
}

/**
 * Takes a JS Date Object and returns the equivalent SQL timestamp string
 */
jsTime2SQLTime = (t) => {
    return new Date(t).toISOString().slice(0,19).replace('T',' ');
}

/**
 * Takes a SQL timestamp string and returns the equivalent JS Date object
 */
sqlTime2JSTime = (t) => {
    let s = t.split(/[- :]/);
    d = new Date(Date.UTC(s[0], s[1]-1, s[2], s[3], s[4], s[5]));
}

getBannerInfo = (pid, pem) => {
    return new Promise((resolve, reject) => {
        try {
            let t = new Date().getTime()/1000;
            let claims = {
                'iss': 'uusid=saacs-service,ou=services,dc=vt,dc=edu',
                'iat': t,  //Now in seconds
                'exp': t + 60*60 //60 seconds from now
            }
            let opts = {
                algorithm: "RS256"
            }
            let accessToken = jwt.sign(claims,pem,opts);
            
            //axios.get(`https://dev.api.middleware.vt.edu/v2/users?with=all&uupid=${pid}`, {
            axios.get(`https://api.middleware.vt.edu/v2/users?with=all&uupid=${pid}`, {
                headers: {
                    'Authorization': 'Bearer '+accessToken
                }
            }).then((resp) => {
                console.log(resp.data[0]);
                resolve(resp.data[0] || {});
            }).catch((err) => {
                Log.error(`Couldn't get banner info for ${pid}:${err}`);
                resolve({});
            });
        } catch (error) {
            Log.error(`Couldn't get banner info for ${pid}:${error}`);
            resolve({});
        }
    })
}

/**
 * Fixes system taking the EST/EDT time and marking it as UTC
 */
getTimeStamp = () => {
    let d = new Date(); //EST/EDT time but marked as UTC
    let est = new Date(
        d.toLocaleString('en-US', {timeZone: 'America/New_York'})
    ); //Same time but +3/4
    let tzOffset = d.valueOf() - est.valueOf() //Get actual timezone offset by subtracting the two
    tzOffset = Math.round(tzOffset / 60 / 60 / 1000) //Convert from ms to hrs
    d.setHours(d.getHours() - tzOffset) //Set the proper hour by subtracting the timezone offset
    return d.toISOString().slice(0,19).replace('T',' '); //Convert to string and Reformat
}