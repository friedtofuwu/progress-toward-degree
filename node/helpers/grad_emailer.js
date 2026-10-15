const Log = require("../database/utils/Log");
const { getGradForceAddForAdvisor: getForceAddForAdvisor } = require("../database/utils/Grad_ForceAdd");
const { getCurrentUser } = require("../api/helpers");
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    host: "smtp.cs.vt.edu", //antispam
    port: 465,
    secure: true,
    auth:{
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASSWORD
    }
});

const readableTimeStamp = (t) => {
    let s =  t.toString().slice(4).split(/[- :T.]/);
    console.log(s);
    
    let time = `${(parseInt(s[3]) == 0 || parseInt(s[3]) == 12) ? 12 : parseInt(s[3])%12}:${parseInt(s[4]) < 10 ? "0"+parseInt(s[4]) : s[4]}${(s[3] > 12 ? "PM":"AM")}`;
    let date = `${s[0]} ${parseInt(s[1])} ${s[2]}`;
    return time+" "+date;
}

const readableTerm = (t) => {
    return (
        (t % 100 == 1) ? "Spring" :
        (t % 100 == 9) ? "Fall" :"Summer"
    ) + ` ${parseInt(t/100)} (${t})`;
}

module.exports.forceAddSubmittedEmail = (requestID) => {
    return new Promise((resolve,reject) => {
        //Get the Force/Add so I can pull details for the email
        getForceAddForAdvisor(requestID).then((result) => {
            if(!result) { //Couldn't find Force/Add
                Log.error(`Could not find Force/Add request ${requestID} to send submission email`,"System",null)
                reject(`Couldn't find Force/Add: ${err}`);
            }
            //Found Force/Add so can use to send email
            etext = `Your Force/Add Request ${requestID} was recieved at ${readableTimeStamp(result.submission_timestamp)} and you will be notified once it has been reviewed and processed.`;
            ehtml = `
                <p>Your Force/Add Request was recieved at ${readableTimeStamp(result.submission_timestamp)} and you will be notified once it has been reviewed and processed.</p>
                <ul style="list-style-type:none;">
                    <li>Term: ${readableTerm(result.term)}</li>
                    <li>Course ID: ${result.course_id}</li>
                    <li>Requested Section(s): ${
                        (result.first_choice && result.second_choice) ? `${result.first_choice} or ${result.second_choice}`:
                        (result.first_choice && !result.second_choice) ? `${result.first_choice}`:
                        (!result.first_choice && result.second_choice) ? `${result.second_choice}`:
                        (!result.first_choice && !result.second_choice) ? "Any Section": "Error"
                    }</li>
                    <li>Droppable Section(s): ${result.drops}</li>
                </ul>
                <p>You will be unable to submit additional requests for this course until your request has been reviewed. If you have enrolled yourself in this course and no longer need to be a force/add, please cancel your request.</p>
                <p>To view your submitted request please go to <a href="https://saacs.endeavour.cs.vt.edu/grad/forceadd/${requestID}" title="Your Force/Add Request">https://saacs.endeavour.cs.vt.edu/grad/forceadd/${requestID}</a>.</p>
                <p>The Graduate Force Add Request will close on Thursday, August 28 at 11:59PM</p>
            `;
            transporter.sendMail({
                from: '"gradinfo" <gradinfo@cs.vt.edu>',
                to: `${result.pid}@vt.edu`,
                subject: `Force/Add Request ${requestID}`,
                text: etext,
                html: ehtml
            }).then(() => {
                Log.info(`Sent Force/Add Submission Email for request ${requestID}`,"System");
                return resolve(null);
            }).catch((err) => {
                Log.error(`Failed to send submission email for Force/Add request ${requestID}`,"System",err);
                reject(`Error sending email: ${err}`);
            })
        }).catch((err) => {
            Log.error(`Error occured while trying to get Force/Add request ${requestID} to send submission email`,"System",err)
            reject(`Error getting Force/Add: ${err}`);
        })
    })
}

module.exports.forceAddApprovedEmail = (requestID) => {
    return new Promise((resolve,reject) => {
        //Get the Force/Add so I can pull details for the email
        getForceAddForAdvisor(requestID).then((result) => {
            if(!result) { //Couldn't find Force/Add
                Log.error(`Could not find Force/Add request ${requestID} to send approval email`,"System",null)
                reject(`Couldn't find Force/Add: ${err}`);
            }
            //Found Force/Add so can use to send email
            etext = `Your Force/Add Request ${requestID} was approved, and the requested course has been added to your schedule. Please check HokieSpa to confirm. Please note: if you drop this course, you will not be re-added. You can view your request at https://saacs.endeavour.cs.vt.edu/grad/forceadd/${requestID}`;
            ehtml = `
                <p>Your Force/Add Request was approved, and the requested course has been added to your schedule. Please check HokieSpa to confirm.</p>
                <p>Please note: if you drop this course, you will not be re-added.</p>
                <p>To view your submitted request, please go to <a href="https://saacs.endeavour.cs.vt.edu/grad/forceadd/${requestID}" title="Your Force/Add Request">https://saacs.endeavour.cs.vt.edu/grad/forceadd/${requestID}</a>.</p>
                <p>The Graduate Force Add Request will close on Thursday, August 28 at 11:59PM</p>
            `;
            transporter.sendMail({
                from: '"gradinfo" <gradinfo@cs.vt.edu>',
                to: `${result.pid}@vt.edu`,
                subject: `Re: Force/Add Request ${requestID}`,
                text: etext,
                html: ehtml
            }).then(() => {
                Log.info(`Sent Force/Add Approval Email for request ${requestID}`,"System");
                return resolve(null);
            }).catch((err) => {
                Log.error(`Failed to send approval email for Force/Add request ${requestID}`,"System",err);
                reject(`Error sending email: ${err}`);
            })
        }).catch((err) => {
            Log.error(`Error occured while trying to get Force/Add request ${requestID} to send approval email`,"System",err)
            reject(`Error getting Force/Add: ${err}`);
        })
    })
}

module.exports.forceAddSoftDenyEmail = (requestID) => {
    return new Promise((resolve,reject) => {
        //Get the Force/Add so I can pull details for the email
        getForceAddForAdvisor(requestID).then((result) => {
            if(!result) { //Couldn't find Force/Add
                Log.error(`Could not find Force/Add request ${requestID} to send soft denial email`,"System",null)
                reject(`Couldn't find Force/Add: ${err}`);
            }
            //Found Force/Add so can use to send email
            etext = `Your Force/Add Request ${requestID} was Denied at ${readableTimeStamp(result.status_timestamp)}. Please review your request to see why it was denied and then you may resubmit your request with whatever necessary changes.`;
            ehtml = `
                <p>Your Force/Add Request was Denied at ${readableTimeStamp(result.status_timestamp)}.</p>
                <p>Please review your request to see why it was denied and then you may resubmit your request with whatever necessary changes.</p>
                <ul style="list-style-type:none;">
                    <li>Term: ${readableTerm(result.term)}</li>
                    <li>Course ID: ${result.course_id}</li>
                    <li>Comments: ${result.external_comments}</li>
                </ul>
                <p>To view your submitted request please go to <a href="https://saacs.endeavour.cs.vt.edu/grad/forceadd/${requestID}" title="Your Force/Add Request">https://saacs.endeavour.cs.vt.edu/grad/forceadd/${requestID}</a>.</p>
                <p>The Graduate Force Add Request will close on Thursday, August 28 at 11:59PM</p>
            `;
            transporter.sendMail({
                from: '"gradinfo" <gradinfo@cs.vt.edu>',
                to: `${result.pid}@vt.edu`,
                subject: `Re: Force/Add Request ${requestID}`,
                text: etext,
                html: ehtml
            }).then(() => {
                Log.info(`Sent Force/Add Approval Email for request ${requestID}`,"System");
                return resolve(null);
            }).catch((err) => {
                Log.error(`Failed to send approval email for Force/Add request ${requestID}`,"System",err);
                reject(`Error sending email: ${err}`);
            })
        }).catch((err) => {
            Log.error(`Error occured while trying to get Force/Add request ${requestID} to send approval email`,"System",err)
            reject(`Error getting Force/Add: ${err}`);
        })
    })
}

module.exports.forceAddCanceledEmail = (requestID) => {
    return new Promise((resolve,reject) => {
        //Get the Force/Add so I can pull details for the email
        getForceAddForAdvisor(requestID).then((result) => {
            if(!result) { //Couldn't find Force/Add
                Log.error(`Could not find Force/Add request ${requestID} to send submission email`,"System",null)
                reject(`Couldn't find Force/Add: ${err}`);
            }
            //Found Force/Add so can use to send email
            etext = `Your Force/Add Request ${requestID} was cancelled at ${readableTimeStamp(result.status_timestamp)}. Once a request is canceled, this cannot be reversed and a new request will need to be submitted. You can view your request at https://saacs.endeavour.cs.vt.edu/grad/forceadd/${requestID}`;
            ehtml = `
                <p>Your Force/Add Request was cancelled at ${readableTimeStamp(result.status_timestamp)}.</p>
                <ul style="list-style-type:none;">
                    <li>Term: ${readableTerm(result.term)}</li>
                    <li>Course ID: ${result.course_id}</li>
                    <li>Requested Section(s): ${
                        (result.first_choice && result.second_choice) ? `${result.first_choice} or ${result.second_choice}`:
                        (result.first_choice && !result.second_choice) ? `${result.first_choice}`:
                        (!result.first_choice && result.second_choice) ? `${result.second_choice}`:
                        (!result.first_choice && !result.second_choice) ? "Any Section": "Error"
                    }</li>
                    <li>Droppable Section(s): ${result.drops}</li>
                </ul>
                <p>Once a request is canceled, this cannot be reversed and a new request will need to be submitted. To view your cancelled request please go to <a href="https://saacs.endeavour.cs.vt.edu/grad/forceadd/${requestID}" title="Your Force/Add Request">https://saacs.endeavour.cs.vt.edu/grad/forceadd/${requestID}</a>.</p>
                <p>The Graduate Force Add Request will close on Thursday, August 28 at 11:59PM</p>
            `;
            transporter.sendMail({
                from: '"gradinfo" <gradinfo@cs.vt.edu>',
                to: `${result.pid}@vt.edu`,
                subject: `Force/Add Request ${requestID}`,
                text: etext,
                html: ehtml
            }).then(() => {
                Log.info(`Sent Force/Add Canclled Email for request ${requestID}`,"System");
                return resolve(null);
            }).catch((err) => {
                Log.error(`Failed to send cancelled email for Force/Add request ${requestID}`,"System",err);
                reject(`Error sending email: ${err}`);
            })
        }).catch((err) => {
            Log.error(`Error occured while trying to get Force/Add request ${requestID} to send cancelled email`,"System",err)
            reject(`Error getting Force/Add: ${err}`);
        })
    })
}