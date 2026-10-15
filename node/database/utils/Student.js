const { DB, tableNames } = require('../handler');
const { getCoursesByStudentID } = require('./Course');
const { getViolationsByStudentID } = require('./Violation');
const Log = require('./Log');
const { getViolationCoursesByViolationID } = require('./ViolationCourse');
const typedefs = require('../../helpers/typedefs')
const { arrayFrom } = require('../../helpers/objectManipulation');

class Student {
    constructor({
        id, name, standing_message, admit_term, current_term, concentration,
        advisor_lname, overall_hours_attempted, overall_gpa,
        transfer_hours_earned, in_major_gpa
    }) {
        this.id = id;
        this.name = name;
        this.standingMessage = standing_message;
        this.admitTerm = admit_term;
        this.currentTerm = current_term;
        this.concentration = concentration;
        this.advisorLName = advisor_lname;
        this.overallHoursAttempted = overall_hours_attempted;
        this.overallGPA = overall_gpa;
        this.transferHoursEarned = transfer_hours_earned;
        this.inMajorGPA = in_major_gpa
    }
    toJSON() {
        return {
            id: this.id,
            name: this.name,
            standing_message: this.standingMessage,
            admit_term: this.admitTerm,
            current_term: this.currentTerm,
            concentration: this.concentration,
            advisor_lname: this.advisorLName,
            overall_hours_attempted: this.overallHoursAttempted,
            overall_gpa: this.overallGPA,
            transfer_hours_earned: this.transferHoursEarned,
            in_major_gpa: this.inMajorGPA
        }
    }

    getViolations() { return getViolationsByStudentID(this.id) }
    getCourses() { return getCoursesByStudentID(this.id) }
}
module.exports.Student = Student;

/**
 * Returns all students in the database
 */
module.exports.getAllStudents = () => {
    return new Promise((resolve, reject) => {
        DB.selectAll(tableNames.student, null, [], 'name')
            .then(({ result }) => {
                return resolve(result.map((res) => new Student(res)));
            }).catch((err) => reject(err));
    })
}

/**
 * Returns all students in the database with courses and flags (violations)
 * included in the structures
 */
module.exports.getAllStudentData = () => {
    return new Promise((resolve, reject) => {
        let allStudents = {};
        module.exports.getAllStudents().then(async (students) => {
            // Add each student to structure
            for (let s of students) {
                allStudents[s.id] = {
                    name: s.name,
                    standingMessage: s.standingMessage,
                    admitTerm: s.admitTerm,
                    currentTerm: s.currentTerm,
                    concentration: s.concentration,
                    advisorLName: s.advisorLName,
                    overallHoursAttempted: s.overallHoursAttempted,
                    overallGPA: s.overallGPA,
                    transferHoursEarned: s.transferHoursEarned,
                    inMajorGPA: s.inMajorGPA,
                    courses: [],
                    flags: []
                }

                // Add courses for this student to their entry
                try {
                    const courses = await getCoursesByStudentID(s.id);
                    allStudents[s.id].courses = courses.map((c) => ({
                        subjExpanded: c.subjExpanded,
                        courseNumber: c.courseNumber,
                        termTaken: c.termTaken,
                        creditHours: c.creditHours,
                        grade: c.grade,
                    }));
                } catch (err) {
                    Log.error(`Error getting courses by student ID '${s.id}:`, null, err);
                    return reject(err)
                }

                // Add flags (violations) for this student to their entry
                try {
                    const flags = await getViolationsByStudentID(s.id);
                    let studentFlags = flags.map((f) => ({
                        id: f.id,
                        type: f.type,
                        isWarning: f.isWarning,
                        associatedCourses: []
                    }));

                    // Add associated courses to each flag
                    for (let currFlagIndex in studentFlags) {
                        const currFlag = studentFlags[currFlagIndex];
                        try {
                            const assocCourses = await getViolationCoursesByViolationID(currFlag.id);
                            studentFlags[currFlagIndex].associatedCourses = assocCourses.map((ac) => ({
                                subjExpanded: ac.subjExpanded,
                                courseNumber: ac.courseNumber,
                                termTaken: ac.termTaken
                            }));
                        } catch (err) {
                            Log.error(`Error getting associated flags for violation '${currFlag.id}':`, null, err);
                            return reject(err)
                        }
                    }

                    allStudents[s.id].flags = studentFlags;
                } catch (err) {
                    Log.error(`Error getting violations by student ID '${s.id}':`, null, err);
                    return reject(err)
                }
            }

            return resolve(allStudents);
        }).catch((err) => {
            Log.error('Error getting all students:', null, err);
            return reject(err)
        });
    })
}

/**
 * Returns all distinct advisor names among students in the database
 */
module.exports.getAllAdvisorLNames = () => {
    return new Promise((resolve, reject) => {
        DB.queryDistinctColumnValues(tableNames.student, 'advisor_lname', true)
            .then(({ result }) => {
                // Move empty name to end if at front
                if (result[0] === '') {
                    return resolve([...result.slice(1), ''])
                } else {
                    return resolve(result)
                }
            })
            .catch((err) => reject(err))
    })
}

/**
 * Returns the desired student if present in the database, or null otherwise
 *
 * @param {Int} id The ID of the student as stored in the database's Student
 *                    table
 */
module.exports.getStudentByID = (id) => {
    return new Promise((resolve, reject) => {
        DB.selectOneWhere(tableNames.student, null, [], { id }, [])
            .then(({ result }) => {
                if (result === null) {
                    return resolve(null);
                } else {
                    return resolve(new Student(result));
                }
            }).catch((err) => reject(err))
    })
}

/**
 * Returns all students who have the given advisor
 * 
 * @param {String} advisorLName The advisor to filter by. If `null`, gets all
 *                              students.
 */
module.exports.getStudentsByAdvisor = (advisorLName) => {
    if (advisorLName === null) {
        return module.exports.getAllStudents();
    } else {
        return new Promise((resolve, reject) => {
            DB.selectWhere(
                tableNames.student, null, [],
                { advisor_lname: advisorLName }, []
            ).then(({ result }) => {
                return resolve(result.map((res) => new Student(res)));
            }).catch((err) => reject(err));
        })
    }
}

module.exports.getFullStudentInfo = async () => {
    const colNames = [
        's.id', 's.name', 'asi.email', 's.admit_term', 'asi.completion_term_code', 's.advisor_lname', 's.standing_message', 
        's.concentration', 's.overall_gpa', 's.in_major_gpa', 's.overall_hours_attempted', 's.transfer_hours_earned', 
        'c.subj_expanded', 'c.course_number', 'c.term_taken', 'c.credit_hours', 'c.grade', 'asi.missing_courses' 
    ]

    const colNamesStr = colNames.join(", ")

    const studentQuery = `SELECT ${colNamesStr} FROM \`${tableNames.student}\` s`
        + ` LEFT JOIN ${tableNames.additional} asi ON s.id=asi.student_id`
        + ` LEFT JOIN ${tableNames.course} c ON c.student_id=s.id`

    const result = await DB.query(studentQuery)

    return Promise.resolve(result.result)
}


/**
 * uploads batch of student information to the db
 *
 * @param {typedefs.StudentInfo[]} studentList
 * @returns {Promise} promise on success
 */
module.exports.uploadParserStudentList = (studentList) => {
    return new Promise((resolve, reject) => {
        DB.query(
            `INSERT INTO \`${tableNames.student}\` VALUES ${arrayFrom('(?,?,?,?,?,?,?,?,?,?,?)', studentList.length).join(',')};`,
            studentList.map((student) => (
                [student.id, student.name, student.standing_message, student.admit_term, 
                    student.current_term, student.concentration, student.advisor_lname, student.overall_hours_attempted, 
                    student.overall_gpa, student.transfer_hours_earned, student.in_major_gpa]
            )).flat()
        )
            .then(() => resolve())
            .catch((err) => {
                Log.error(`Parser student list upload for student, error inserting student:`, null, err);
                reject(err)
            });
    })
}

/**
 * upload additional student information from full_data spreadsheet
 *
 * @param {typedefs.AdditionalStudentInfo[]} additionalList object from readExcelFile
 * @returns {Promise} promise on success
 */
module.exports.uploadParserAdditionalList = (additionalList) => {

    return new Promise((resolve, reject) => {
        //Can only have up to 65,535 (2^16-1) place holders
        //Since we're doing 5 per row can only do like 65535/5 = 13107 rows at a time
        let interval = 13107
        for (let i = 0; i < additionalList.length; i += interval) {
            al = additionalList.slice(i,i+interval);
            DB.query(
                `INSERT INTO \`${tableNames.additional}\` VALUES ${arrayFrom('(?,?,?,?,?)', al.length).join(',')};`,
                al.map((student) => (
                    //If student hasn't set a completion date then make it 0 for now
                    [student.id, student.email_address, student.completion_term_code ? student.completion_term_code : 0, 
                        student.graduation_ready, JSON.stringify(student.missing_courses)]
                )).flat()
            )
                .then(() => resolve())
                .catch((err) => {
                    Log.error(`Parser additional student info list upload error inserting info:`, null, err);
                    reject(err)
                });
            }
    })
}
