const { arrayFrom } = require('../../helpers/objectManipulation');
const { DB, tableNames } = require('../handler');
const Log = require('./Log');
const typedefs = require('../../helpers/typedefs')

class Course {
    constructor({
        subj_expanded, course_number, term_taken, credit_hours, grade,
        student_id
    }) {
        this.subjExpanded = subj_expanded;
        this.courseNumber = course_number;
        this.termTaken = term_taken;
        this.creditHours = credit_hours;
        this.grade = grade;
        this.studentId = student_id;
    }
    toJSON() {
        return {
            subj_expanded: this.subjExpanded,
            course_number: this.courseNumber,
            term_taken: this.termTaken,
            credit_hours: this.creditHours,
            grade: this.grade,
            student_id: this.studentId
        }
    }

    getFullCourseName() {
        return module.exports.mergeCourseName(this.subjExpanded, this.courseNumber)
    }
    splitTermTaken() { return module.exports.splitTerm(this.termTaken) }
}
module.exports.Course = Course;

/**
 * Returns all courses in the database
 */
module.exports.getAllCourses = () => {
    return new Promise((resolve, reject) => {
        DB.selectAll(tableNames.course, null, []).then(({ result }) => {
            return resolve(result.map((res) => new Course(res)));
        }).catch((err) => reject(err));
    })
}

/**
 * Returns the desired course if present in the database, or null otherwise
 *
 * @param {Int} id The ID of the course as stored in the database's Course
 *                    table
 */
module.exports.getCourseByInfo = (subjExpanded, courseNumber, termTaken, studentId) => {
    return new Promise((resolve, reject) => {
        DB.selectOneWhere(tableNames.course, null, [], {
            subj_expanded: subjExpanded,
            course_number: courseNumber,
            term_taken: termTaken,
            student_id: studentId
        }, [])
            .then(({ result }) => {
                if (result === null) {
                    return resolve(null);
                } else {
                    return resolve(new Course(result));
                }
            }).catch((err) => reject(err))
    })
}

/**
 * Returns all courses a student of the given id is taking.
 *
 * @param {Int} id The ID of the student to get courses for
 * @param {Boolean} sortTermAscending If true, the courses will be sorted by
 *                                    term in ascending order. If false, terms
 *                                    will be in descending order.
 */
module.exports.getCoursesByStudentID = (id, sortChronological = false) => {
    return new Promise((resolve, reject) => {
        DB.query(`SELECT * FROM \`${tableNames.course}\` WHERE \`student_id\`=? ORDER BY ${sortChronological ? 'term_taken DESC, ' : ''}subj_expanded ASC, course_number ASC;`, [id])
            .then(({ result }) => resolve(result.map((res) => new Course(res))))
            .catch((err) => reject(err));
    })
}

/**
 * Helper function, does not query the database.
 * Splits a full course name into its subject and course number.
 * 
 * @param {String} courseName A full course name (e.g. 'CS2114')
 * @returns The course name, split into a string and a number (e.g. ['CS', '2114'])
 */
module.exports.splitCourseName = (courseName) => {
    const matches = courseName.match(/^([A-Z]{1,8})([0-9][0-9A-Z]{0,5})$/);
    if (matches) {
        return [matches[1], matches[2]];
    } else {
        return null;
    }
}

/**
 * Helper function, does not query the database.
 * Merges a subject and course number into their full course name.
 * 
 * @param {String} courseName A subject and course number (e.g. ('CS', '2114'))
 * @returns The full course name (e.g. 'CS2114')
 */
module.exports.mergeCourseName = (subjExpanded, courseNumber) => {
    return `${subjExpanded}${courseNumber}`
}

/**
 * Helper function, does not query the database.
 * Splits a term number into its year and month.
 * 
 * @param {Int} term A number representing the term (e.g. 202209)
 * @returns The term, split into a year and month (e.g. [2022, 9])
 */
module.exports.splitTerm = (term) => {
    return [~~(term / 100), term % 100];
}

/**
 * Uploads the given list of courses for student of given ID to the database.
 *
 * @param {typedefs.CourseInfo[]} courseList
 */
module.exports.uploadParserCourseList = (courseList) => {
    return new Promise((resolve, reject) => {
        //Can only have up to 65,535 (2^16-1) place holders
        //Since we're doing 6 per row can only do like 65535/6 ~= 10922 rows at a time
        for (let i = 0; i < courseList.length; i += 10922) {
            cl = courseList.slice(i,i+10922)
            DB.query(
                `INSERT INTO \`${tableNames.course}\` VALUES ${arrayFrom('(?,?,?,?,?,?)', cl.length).join(',')};`,
                cl.map((course) => (
                    [course.subj_expanded, course.course_number, course.term_taken, course.credit_hours, course.grade, course.student_id]
                )).flat()
            )
                .then(() => resolve())
                .catch((err) => {
                    Log.error(`Parser course list upload for student, error inserting courses:`, null, err);
                    reject(err)
                });
            }
    })
}
