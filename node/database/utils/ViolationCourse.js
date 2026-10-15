const { DB, tableNames } = require('../handler');
const { getCourseByInfo } = require('./Course');

class ViolationCourse {
    constructor({
        violation_id, student_id, subj_expanded, course_number, term_taken
    }) {
        this.violationID = violation_id
        this.studentId = student_id;
        this.subjExpanded = subj_expanded;
        this.courseNumber = course_number;
        this.termTaken = term_taken;
    }
    toJSON() {
        return {
            violation_id: this.violationID,
            student_id: this.studentId,
            subj_expanded: this.subjExpanded,
            course_number: this.courseNumber,
            term_taken: this.termTaken
        }
    }

    getFullCourse() {
        return getCourseByInfo(
            this.subjExpanded, this.courseNumber, this.termTaken, this.studentId
        );
    }
}
module.exports.ViolationCourse = ViolationCourse;

/**
 * Returns all violation courses associated with the violation of the given ID.
 *
 * @param {String} id The ID of the violation to get violation courses for
 */
module.exports.getViolationCoursesByViolationID = (id) => {
    return new Promise((resolve, reject) => {
        DB.selectWhere(
            tableNames.violationCourse, null, [],
            { violation_id: id }, []
        )
            .then(({ result }) => resolve(result.map((res) => new ViolationCourse(res))))
            .catch((err) => reject(err));
    })
}
