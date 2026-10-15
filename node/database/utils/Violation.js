const { arrayFrom } = require('../../helpers/objectManipulation');
const { DB, tableNames } = require('../handler');
const { getViolationCoursesByViolationID } = require('./ViolationCourse');
const { getViolationTypeByID } = require('./ViolationType');
const Log = require('./Log');

class Violation {
    constructor({ id, student_id, type, is_warning }) {
        this.id = id;
        this.studentId = student_id;
        this.type = type;
        this.isWarning = !!is_warning;
    }
    toJSON() {
        return {
            id: this.id,
            student_id: this.studentId,
            type: this.type,
            is_warning: this.isWarning ? 1 : 0
        }
    }

    getAssociatedCourses() {
        return new Promise((resolve, reject) => {
            getViolationCoursesByViolationID(this.id).then(async (courses) => {
                try {
                    for (i in courses) {
                        courses[i] = await courses[i].getFullCourse();
                    }
                    return resolve(courses);
                } catch (err) {
                    return reject(err);
                }
            }).catch((err) => reject(err))
        })
    }

    getMessage() {
        return new Promise((resolve, reject) => {
            getViolationTypeByID(this.type).then((result) => {
                if (this.isWarning) {
                    if (result.warningMessage === null) {
                        // Warning type not possible for this flag type;
                        // default to normal violation message
                        Log.warn(`Violation ${this.id}: violation of type ${this.type} cannot be a warning.`);
                        return resolve(result.message);
                    } else {
                        return resolve(result.warningMessage);
                    }
                } else {
                    return resolve(result.message);
                }
            }).catch((err) => reject(err));
        })
    }
}
module.exports.Violation = Violation;

/**
 * Returns all violations in the database
 */
module.exports.getAllViolations = () => {
    return new Promise((resolve, reject) => {
        DB.selectAll(tableNames.violation, null, [])
            .then(({ result }) => {
                return resolve(result.map((res) => new Violation(res)));
            }).catch((err) => reject(err));
    })
}


/**
 * Returns violations and courses if found in the database
 */
module.exports.getFullViolations = () => {
    return new Promise((resolve, reject) => {
        const cols = ['v.student_id', 'v.is_warning', 'v.type',
            'vc.subj_expanded', 'vc.course_number', 'vc.term_taken', 'm.message']

        const query = `SELECT ${cols} FROM ${tableNames.violation} v` 
            + ` LEFT JOIN ${tableNames.violationCourse} vc ON v.student_id=vc.student_id AND`
            + ` v.id=vc.violation_id`
            + ` LEFT JOIN ${tableNames.violationType} m ON v.type=m.id`

        DB.query(query)
            .then(({ result }) => {
                return resolve(result);
            }).catch((err) => reject(err));
    })
}

/**
 * Returns the desired violation if present in the database, or null otherwise
 *
 * @param {String} id The ID of the violation as stored in the database's
 *                    Violation table
 */
module.exports.getViolationByID = (id) => {
    return new Promise((resolve, reject) => {
        DB.selectOneWhere(tableNames.violation, null, [], { id }, [])
            .then(({ result }) => {
                if (result === null) {
                    return resolve(null);
                } else {
                    return resolve(new Violation(result));
                }
            }).catch((err) => reject(err))
    })
}

/**
 * Returns all violations associated with a student of the given id. If the
 * student has no violations, will return an empty list
 *
 * @param {Int} id The ID of the student to get violations for
 */
module.exports.getViolationsByStudentID = (id) => {
    return new Promise((resolve, reject) => {
        DB.selectWhere(tableNames.violation, null, [], { student_id: id }, [])
            .then(({ result }) => resolve(result.map((res) => new Violation(res))))
            .catch((err) => reject(err));
    })
}

/**
 * Uploads the given list of flags (violations) for student of given ID to the
 * database.
 */
module.exports.uploadParserFlagList = (flagList) => {
    return new Promise(async (resolve, reject) => {
        for (let { student_id, type, isWarning, associatedCourses } of flagList) {
            try {
                await new Promise((resolve, reject) => {
                    // Insert violation into the database
                    DB.insert(tableNames.violation, {
                        student_id, type: type, is_warning: isWarning ? 1 : 0
                    }, [])
                        .then(({ result }) => {
                            const violationId = result.insertId;

                            //console.log(violationId)
                            // Insert any associated courses into the violation
                            // course table
                            if (associatedCourses) {
                                let vc = [];
                                associatedCourses.forEach(course => {
                                    vc = vc.concat([violationId, student_id, course.subjExpanded, course.courseNumber, course.termTaken])
                                });
                                DB.query(
                                    `INSERT INTO \`${tableNames.violationCourse}\` VALUES ${arrayFrom('(?,?,?,?,?)', associatedCourses.length).join(',')};`,
                                        vc
                                )
                                    .then(() => resolve())
                                    .catch((err) => {
                                        Log.error(`Parser flag list upload: Error inserting violation course:`, null, err);
                                        return reject(err)
                                    })
                            } else {
                                return resolve();
                            }
                        }).catch((err) => {
                            Log.error(`Parser flag list upload for student: Error inserting violation:`, null, err);
                            return reject(err)
                        });
                });
            } catch (err) {
                return reject(err);
            }
        }
        return resolve();
    })
}

/**
 * Returns all messages for all possible types
 */
module.exports.getAllViolationMessages = () => {
    return new Promise((resolve, reject) => {
        DB.selectAll(tableNames.violationType).then(({ result }) => {
            return resolve(result.reduce(
                (acc, { id, message, warning_message }) => {
                    acc[id] = {
                        message, warningMessage: warning_message || message
                    };
                    return acc;
                }, {}
            ));
        }).catch((err) => reject(err));
    })
}
