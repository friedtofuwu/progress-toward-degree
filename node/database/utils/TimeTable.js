const { DB, tableNames } = require('../handler')
const axios = require('axios');

class Timetable {
    constructor({termcode, crn, course_id, course_name, credit_hrs,
        instructor, meet_days, begin_time, end_time, location, campus,
        current_enrollment, max_enrollment, active, ignore_enrollment
    }) {
        this.termcode = termcode;
        this.crn = crn;
        this.course_id = course_id;
        this.course_name = course_name;
        this.credit_hrs = credit_hrs;
        this.instructor = instructor;
        this.meet_days = meet_days;
        this.begin_time = begin_time;
        this.end_time = end_time;
        this.location = location;
        this.campus = campus;
        this.current_enrollment = current_enrollment;
        this.max_enrollment = max_enrollment;
        this.active = active;
        this.ignore_enrollment = ignore_enrollment;
    } toJSON() {
        return {
            termcode: this.termcode,
            crn: this.crn,
            course_id: this.course_id,
            course_name: this.course_name,
            credit_hrs: this.credit_hrs,
            instructor: this.instructor,
            meet_days: this.meet_days,
            begin_time: this.begin_time,
            end_time: this.end_time,
            location: this.location,
            campus: this.campus,
            current_enrollment: this.current_enrollment,
            max_enrollment: this.max_enrollment,
            active: this.active,
            ignore_enrollment: this.ignore_enrollment
        }
    }
}

const fullColSelection = ['termcode', 'crn', 'course_id', 'course_name',
    'credit_hrs', 'instructor', 'meet_days', 'begin_time', 'end_time',
    'location', 'campus', 'current_enrollment', 'max_enrollment', 'active',
    'ignore_enrollment'
]
const fullColSelectionList = []

/**
 * Returns all timetables in the database
 */
module.exports.getAllTimetables = () => {
    return new Promise((resolve, reject) => {
        DB.selectAll(tableNames.timetable, fullColSelection, fullColSelectionList)
        .then(({ result }) => {
            return resolve(result.map((res) => new Timetable(res)));
        }
        ).catch((err) => reject(err))
    })
}

/**
 * Returns all timetables in the database with the matching termcode
 * @param {Int} termcode 
 * @returns List of matching timetables
 */
module.exports.getAllTimetablesByTermCode = (termcode) => {
    return new Promise((resolve, reject) => {
        DB.selectWhere(
            tableNames.timetable, fullColSelection, fullColSelectionList, {termcode}
        ).then(({ result }) => {
            return resolve(result.map((res) => new Timetable(res)));
        }).catch((err) => reject(err))
    })
}

/**
 * Return all timetables in the database that are active with the matching term code
 * @param {number} termcode
 * @returns 
 */
module.exports.getAllActiveByTermCode = (termcode) => {
    return new Promise((resolve, reject) => {
        DB.selectWhere(
            tableNames.timetable, fullColSelection, fullColSelectionList, {termcode, active:1}
        ).then(({ result }) => {
            return resolve(result.map((res) => new Timetable(res)));
        }).catch((err) => reject(err))
    })
}

/**
 * Return all courses within the database that are active with the matching term code
 * @param {Number} termcode 
 * @returns 
 */
module.exports.getAllActiveClassesByTermCode = (termcode) => {
    return new Promise((resolve, reject) => {
        DB.query(
            `SELECT DISTINCT course_id, course_name
            FROM ${tableNames.timetable}
            WHERE
                active=1 AND
                termcode=? AND
                (
                    current_enrollment < max_enrollment OR
                    ignore_enrollment = 1
                )
            ORDER BY course_id;`,
            [termcode]
        ).then(({result}) => {
            console.log(result);
            return resolve(result);
        }).catch((err) => reject(err))
    })
}

/**
 * Returns all active sections of the matching termcode and course_id
 * @param {Number} termcode 
 * @param {String} course_id 
 * @returns 
 */
module.exports.getAllActiveSectionsByTermCodeAndCourseId = (termcode, course_id) => {
    return new Promise((resolve, reject) => {
        DB.query(
            `SELECT *
            FROM ${tableNames.timetable}
            WHERE
                termcode = ${termcode} AND
                course_id = "${course_id}" AND
                active = 1 AND
                (
                    current_enrollment < max_enrollment OR
                    ignore_enrollment = 1
                )
            ;`
        ).then(({ result }) => {
            console.log(result);
            return resolve(result.map((res) => new Timetable(res)));
        }).catch((err) => reject(err))
    })
}

/**
 * Returns all active sections of the matching termcode and course_id
 * @param {Number} termcode
 * @returns 
 */
module.exports.getSectionsByTermCode = (termcode) => {
    return new Promise((resolve, reject) => {
        DB.selectWhere(
            tableNames.timetable, fullColSelection, fullColSelectionList, {termcode}
        ).then(({ result }) => {
            console.log(result);
            return resolve(result.map((res) => new Timetable(res)));
        }).catch((err) => reject(err))
    })
}

/**
 * 
 * @param {Int} termcode The 6 digit termcode
 * @param {String} clss The class to be searched for (Ex. CS 3214)
 * @returns {array} List of active Timetables that match the given values
 */
module.exports.getAllActiveByClass = (termcode, clss) => {
    return;
}

/**
 * Pulls the latest Timetable JSON and updates the DB to match
 * @returns Number of Timetables updated/inserted
 */
module.exports.updateTimeTable = () => {
    console.log("Reached updateTimeTable in TimeTable.js")
    return new Promise((resolve, reject) => {
        //Get the updated timetable JSON
        console.log("[SYSTEM] Getting timetable update via AXIOS, hopefully?");
        axios.get(
            "https://invtest.endeavour.cs.vt.edu/app/view/timetable.json"
        ).then((response) => {
            //Ensure that the timetable JSON pulled correctly
            /*if(!response.ok) {
                console.log("[SYSTEM] Error getting timetable update via AXIOS");
                throw new Error("HTTP error "+response.status);
            }*/
            console.log("[SYSTEM] Succeeded getting timetable update via AXIOS");
            return response.data
        }).then((timetable) => {
            console.log("[SYSTEM] Separating out CS classes");
            //Seperate CS courses from Full Timetable and check for new term
            let cs = {}
            timetable.forEach(function(value) {
                if(
                    value.COURSE[0] == "C" && //Only pull courses that start w/ "CS "
                    value.COURSE[1] == "S" &&
                    value.COURSE[2] == " " &&
                    value.CRN //Only pull courses that have been assigned CRN
                ) {
                    //Create dictionary of timetable entry and add to list
                    if(!cs[value.TERMCODE+value.CRN]) {
                        cs[value.TERMCODE+value.CRN] = {
                            termcode: parseInt(value.TERMCODE),
                            crn: parseInt(value.CRN),
                            course_id: value.COURSE,
                            course_name: value.COURSE_TITLE,
                            credit_hrs: parseInt(value.LOW_CREDIT_HRS), //value.HIGH_CREDIT_HRS,
                            instructor: value.INSTRUCTOR_UID,
                            meet_days: value.MEETDAYS,
                            begin_time: parseInt(value.BEGIN_TIME),
                            end_time: parseInt(value.END_TIME),
                            location: value.LOCATION,
                            campus: parseInt(value.CAMPUS),
                            current_enrollment: parseInt(value.CURRENT_ENROLLMENT),
                            max_enrollment: parseInt(value.MAX_ENROLLMENT),
                            active: 0,
                            ignore_enrollment: 0
                        }
                    }
                }
            })
            console.log(`[SYSTEM] Found ${cs.length} CS courses in updated timetable`);
            return Object.values(cs);
        }).then((timetable) => {
            //INSERT INTO NewTimetable
            console.log(`[SYSTEM] Inserting entries into NEWTimetable`);
            DB.insertMany(tableNames.newTimetable, timetable)
            .then((response) => {
                console.log(`[SYSTEM] Succeeded in inserting entries into NEWTimetable. Updating Timetable Now`);
                //Update the actual Timetable and clear out NewTimetable
                DB.executeFunction("UpdateTimeTable").then((response) => {
                    console.log(`[SYSTEM]Successfully Updated Timetable`);
                    resolve(response)
                }).catch((err) => {
                    if(err.response) {
                        console.log(err.response.data)
                        console.log(err.response.status)
                        console.log(err.response.headers)
                    } else if (err.request) {
                        console.log(err.request)
                    } else {
                        console.log(err.message);
                    }
                    reject(err)
                })
            }).catch((err) => {
                if(err.response) {
                    console.log(err.response.data)
                    console.log(err.response.status)
                    console.log(err.response.headers)
                } else if (err.request) {
                    console.log(err.request)
                } else {
                    console.log(err.message);
                }
                reject(err)
            })
        }).catch((err) => {
            if(err.response) {
                console.log(err.response.data)
                console.log(err.response.status)
                console.log(err.response.headers)
            } else if (err.request) {
                console.log(err.request)
            } else {
                console.log(err.message);
            }
            reject(err)
        })
    })
}

/**
 * 
 * @param {Int} termcode The termcode for the class
 * @param {Int} crn The 5 digit identified for the class
 * @param {Int} active 0 for inactive and 1 for active
 */
module.exports.setClassState = (termcode, crn, active = 1) => {
    return new Promise((resolve, reject) => {
        DB.update(tableNames.timetable, {active}, [], {termcode, crn})
        .then((response) => resolve(response))
        .catch((err) => reject(err));
    })
}

/**
 * Changes the classes ignore_enrollment to the given value
 * @param {Int} termcode The termcode for the class
 * @param {Int} crn The 5 digit identified for the class
 * @param {Int} ignore 0 for inactive and 1 for active
 */
module.exports.setClassIgnore = (termcode, crn, ignore_enrollment = 1) => {
    return new Promise((resolve, reject) => {
        DB.update(tableNames.timetable, {ignore_enrollment}, [], {termcode, crn})
        .then((response) => resolve(response))
        .catch((err) => reject(err));
    })
}