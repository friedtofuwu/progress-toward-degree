const { DB, tableNames } = require('../handler');

class Grad_ForceAdd {
    constructor({
        forceadd_id,
        pid, id_number,
        banner_name, banner_major, banner_campus, academic_level,
        degree, major, minor, campus, grad_date,
        term, course_id, first_choice, second_choice, drops,
        reason, student_comment, submission_timestamp,
        status, status_timestamp,
        internal_comments, external_comments, emailed
    }) {
        this.forceadd_id = forceadd_id;
        this.pid = pid;
        this.id_number = id_number;
        this.banner_name = banner_name;
        this.banner_major = banner_major;
        this.banner_campus = banner_campus;
        this.academic_level = academic_level;
        this.degree = degree;
        this.major = major;
        this.minor = minor;
        this.campus = campus;
        this.grad_date = grad_date;
        this.term = term;
        this.course_id = course_id;
        this.first_choice = first_choice;
        this.second_choice = second_choice;
        this.drops = drops;
        this.reason = reason;
        this.student_comment = student_comment;
        this.submission_timestamp = submission_timestamp;
        this.status = status;
        this.status_timestamp = status_timestamp;
        this.internal_comments = internal_comments;
        this.external_comments = external_comments;
        this.emailed = emailed;
    } toJSON() {
        return {
            forceadd_id: this.forceadd_id,
            pid: this.pid,
            id_number: this.id_number,
            banner_name: this.banner_name,
            banner_major: this.banner_major,
            banner_campus: this.banner_campus,
            academic_level: this.academic_level,
            degree: this.degree,
            major: this.major,
            minor: this.minor,
            campus: this.campus,
            grad_date: this.grad_date,
            term: this.term,
            course_id: this.course_id,
            first_choice: this.first_choice,
            second_choice: this.second_choice,
            drops: this.drops,
            reason: this.reason,
            student_comment: this.student_comment,
            submission_timestamp: this.submission_timestamp,
            status: this.status,
            status_timestamp: this.status_timestamp,
            internal_comments: this.internal_comments,
            external_comments: this.external_comments,
            emailed: this.emailed
        }
    }
}
module.exports.Grad_ForceAdd = Grad_ForceAdd;

const all_columns = [
    "forceadd_id",
    "pid", "id_number",
    "banner_name", "banner_major", "banner_campus", "academic_level",
    "degree", "major", "minor", "campus", "grad_date",
    "term", "course_id", "first_choice", "second_choice", "drops",
    "reason", "student_comment", "submission_timestamp",
    "status", "status_timestamp",
    "internal_comments", "external_comments", "emailed"
];
const external_columns = [
    "forceadd_id",
    "pid", "id_number", 
    "banner_name", "banner_major", "banner_campus", "academic_level",
    "degree", "major", "minor", "campus", "grad_date",
    "term", "course_id", "first_choice", "second_choice", "drops",
    "reason", "student_comment", "submission_timestamp",
    "status", "status_timestamp",
    "external_comments", "emailed"
];

/**
 * Adds a new Grad_ForceAdd to the database
 * @param {*} pid Submitters PID
 * @param {*} id_number Submitters 90#
 * @param {*} banner_name Name of submitter gotten from Banner
 * @param {*} banner_major Major of submitter gotten from Banner
 * @param {*} banner_campus Campus of submitter gotten from Banner
 * @param {*} academic_level Academic Level indicated by submitter
 * @param {*} degree Degree indicated by submitter
 * @param {*} major Major indicated by submitter
 * @param {*} minor Minor indicated by submitter
 * @param {*} campus Campus indicated by submitter
 * @param {*} grad_date Graduation Date indicated by submitter
 * @param {*} term Term for Force Add request
 * @param {*} course_id Course ID for Force Add request
 * @param {*} first_choice First Choice Section for Force Add request
 * @param {*} second_choice Second Choice Section for Force Add request
 * @param {*} drops CRNs that can be dropped for Force Add request
 * @param {*} reason Reason for Force Add request
 * @param {*} student_comment Submitters comment for Force Add request
 * @param {*} submission_timestamp Submission Timestamp (Defaults to NOW)
 * @param {*} status Current Status (probably 0 for pending)
 * @param {*} status_timestamp Timestamp of Status change (Defaults to NOW)
 * @returns Nothing?
 */
module.exports.addGradForceAdd = (
    pid, id_number,
    banner_name, banner_major, banner_campus, academic_level,
    degree, major, minor, campus, grad_date,
    term, course_id, first_choice, second_choice, drops,
    reason, student_comment, submission_timestamp,
    status, status_timestamp,
) => {
    return new Promise((resolve, reject) => {
        DB.insert(
            tableNames.gradForceAdd, {
                pid, id_number,
                banner_name, banner_major, banner_campus, academic_level,
                degree, major, minor, campus, grad_date,
                term, course_id, first_choice, second_choice, drops,
                reason, student_comment, submission_timestamp,
                internal_comments:"",external_comments:"", //These are empty by default
                status, status_timestamp, emailed: 1
            }
        ).then((resp) => {
            resolve(resp)
        }).catch((err) => {
            console.error(`[ERROR] Error inserting Grad_ForceAdd: `,err)
            reject(err)
        })
    })
}

/**
 * Returns a list of Grad Force Add requests for the Advisor Table
 * @param {Object} filter Properties to filter by 
 * @param {String} sort What to sort the results by
 * @returns Array containing all matching Grad Force Add Submissions
 */
module.exports.getGradForceAddsForAdvisorTable = (filter = {}, sort, sort_dir = "ASC") => {
    return new Promise((resolve, reject) => {
        /*DB.selectWhere(
            tableNames.forceAdd, //Table
            null, //Select Column
            [], //Literal Selects
            filter, //Matches (WHERE)
            [], //Literal Matches
            sort, //Order By
            sort_dir //ASC sort?
        )*/

        let q = `SELECT * FROM \`${tableNames.gradForceAdd}\``;
        let w = [];
        let v = [];
        for(let key in filter) {
            if(filter.hasOwnProperty(key)) {
                let t = [];
                console.log(`${key}: ${JSON.stringify(filter[key])}`);
                filter[key].forEach(element => {
                    //Handle CRN
                    if(key == 'crn') {
                        t.push(`first_choice = ?`);
                        v.push(element); //For fuzzy search
                        t.push(`second_choice = ?`);
                        v.push(element); //For fuzzy search
                    //Handle name
                    } else if(key == 'name') {
                        t.push(`banner_name LIKE ?`);
                        v.push(`%${element}%`); //For fuzzy search
                    //Handle PID, course #
                    } else if(key == 'pid' || key == 'course_id') {
                        t.push(`${key} LIKE ?`);
                        v.push(`%${element}%`); //For fuzzy search
                    //Handle Other degree
                    } else if(key == 'degree' && element == 'Other')
                        t.push(`(
                            degree != 'BS' AND
                            degree != 'BM' AND
                            degree != 'MS' AND
                            degree != 'MEng' AND
                            degree != 'PhD'
                        )`);
                    //Handle Other major
                    else if(key == 'major' && element == 'Other')
                        t.push(`(
                            major != 'CS' AND
                            major != 'DCC' AND
                            major != 'SC' AND
                            major != 'CSA'
                        )`);
                    //Handle Academic Level
                    else if(key == 'academic_level') {
                        if(element == 'Other') {
                            t.push(`(
                                academic_level != 'Senior' AND
                                academic_level != 'Senior Honors' AND
                                academic_level != 'Junior' AND
                                academic_level != 'Junior Honors' AND
                                academic_level != 'Sophomore' AND
                                academic_level != 'Sophomore Honors' AND
                                academic_level != 'Freshman' AND
                                academic_level != 'Freshman Honors'
                            )`);
                        } else {
                            //Normal Level
                            t.push(`academic_level = ?`);
                            v.push(element)
                            //Honors Level
                            t.push(`academic_level = ?`);
                            v.push(element + " Honors");
                        }
                    } else { //Handle standard filtering
                        t.push(`${key} = ?`);
                        v.push(element);
                    }
                });
                w.push("(" + t.join(" OR ") + ")");
            }
        }
        if(w.length > 0)
            q += ` WHERE ${w.join(" AND ")}`;
        q += ` ORDER BY ${sort.join(` ${sort_dir}, `)} ${sort_dir};`
        console.log(q);
        console.log(v);
        DB.query(q,v).then(({result}) => {
            return resolve(
                result.map((res) => new Grad_ForceAdd(res))
            );
        }).catch((err) => {
            console.error(`[ERROR] Error getting Force Adds for advisor table: `,err);
            reject(err);
        });
    })
}

/**
 * Returns a list of Grad Force Add requests for the Students Table
 * @param {Object} filter Properties to filter by 
 * @param {String} sort What to sort the results by
 * @returns Array containing all matching Grad Force Add Submissions w/o internal comments
 */
module.exports.getGradForceAddsForStudentTable = (filter = {}, sort = null, sort_dir = "ASC") => {
    return new Promise((resolve, reject) => {
        DB.selectWhere(
            tableNames.gradForceAdd,
            external_columns, [],
            filter, [],
            sort, sort_dir == "ASC"
        ).then(({result}) => {
            return resolve(
                result.map((res) => new Grad_ForceAdd(res))
            );
        }).catch((err) => {
            console.error(`[ERROR] Error getting Force Adds for student table: `,err);
            reject(err);
        })
    })
}

/**
 * Gets all stored information for the Grad Force Add request
 * @param {int} forceadd_id Database identifier for the Grad Force Add Request
 * @returns The Grad Force Add request, or null if can't be found
 */
module.exports.getGradForceAddForAdvisor = (forceadd_id) => {
    return new Promise((resolve, reject) => {
        DB.selectOneWhere(
            tableNames.gradForceAdd,
            null,
            [],
            {forceadd_id}
        ).then(({result}) => {
            if(result === null)
                return resolve(null);
            else
                return resolve(new Grad_ForceAdd(result));
        }).catch((err) => {
            console.error(`[ERROR] Error getting Grad_ForceAdd ${forceadd_id}: `,err);
            reject(err);
        })
    })
}

/**
 * Gets all external stored information for the Force Add request
 * @param {int} forceadd_id Database identifier for the Grad Force Add request
 * @param {string} pid PID of the student seeking the Grad_ForceAdd request
 * @returns The Grad Force Add request, or null if can't be found
 */
module.exports.getGradForceAddForStudent = (forceadd_id, pid) => {
    return new Promise((resolve, reject) => {
        DB.selectOneWhere(
            tableNames.gradForceAdd,
            external_columns,
            [],
            {forceadd_id, pid}
        ).then(({result}) => {
            if(result === null)
                return resolve(null);
            else
                return resolve(new Grad_ForceAdd(result));
        }).catch((err) => {
            console.error(`[ERROR] Error getting Grad_ForceAdd ${forceadd_id} for ${pid}: `,err);
            reject(err);
        })
    })
}

/**
 * Updates the internal and external comments of the referenced grad_forceadd
 * @param {int} forceadd_id Database identifier for the Grad Force Add request
 * @param {string} internal_comments New internal comments for the forceadd
 * @param {string} external_comments New external comments for the forceadd
 * @returns Success or Failure?
 */
module.exports.updateGradComments = (forceadd_id, internal_comments, external_comments) => {
    return new Promise((resolve, reject) => {
        DB.update(
            tableNames.gradForceAdd, //Table Name
            {internal_comments, external_comments}, [],//Set keyValues
            {forceadd_id}, []//Where keyValues
        ).then((resp) => {
            resolve(resp)
        }).catch((err) => {
            console.error(`[ERROR] Error updating comments for Grad_ForceAdd ${forceadd_id}: `,err)
            reject(err)
        })
    })
}

/**
 * Updates the status of the referenced grad_forceadd
 * @param {int} forceadd_id Database identifier for the Grad Force Add request
 * @param {int} newstatus New Status to be set for the forceadd
 * @param {int} newtime New Timestamp for the status change of the forceadd
 * @param {int} emailed Does CRON job need email about the status change?
 * @returns Success or Failure?
 */
module.exports.updateGradStatus = (forceadd_id, newstatus, newtime, emailed) => {
    return new Promise((resolve, reject) => {
        DB.update(
            tableNames.gradForceAdd, //Table Name
            {status: newstatus, status_timestamp: newtime, emailed}, [],//Set keyValues
            {forceadd_id}, []//Where keyValues
        ).then((resp) => {
            resolve(resp)
        }).catch((err) => {
            console.error(`[ERROR] Error updating status for Grad_ForceAdd ${forceadd_id}: `,err)
            reject(err)
        })
    })
}

/**
 * Fetches a list of all the Undergrad Academic Level options currently in the database
 * This will be superseeded once we have all the proper data we need
 */
module.exports.getGradAcademicLevels = () => {
    return new Promise((resolve, reject) => {
        DB.query(
            `SELECT DISTINCT academic_level FROM ${tableNames.gradForceAdd};`
        ).then(({result}) => {
            return resolve(result);
        }).catch((err) => reject(err))
    })
}