/**
 * list of jsdoc type definitions due to no typescript migration
 * referenced from: https://stackoverflow.com/questions/43183450/jsdoc-typedef-in-a-separate-file
 */

/**
 * @namespace typedefs
 */

/**
 * spreadsheet.js types
 *
 * @typedef Student
 * @property {string} name
 * @property {string} standingMessage
 * @property {number} admitTerm
 * @property {number} currentTerm
 * @property {string} concentration
 * @property {string} advisorLName
 * @property {number} overallHoursAttempted
 * @property {number} overallGPA
 * @property {number} transferHoursEarned
 * @property {number} inMajorGPA
 * @property {number} spreadsheetIndex - testing variable
 * @property {Course[]} courses
 * @memberof typedefs
 * 
 * @typedef Course
 * @property {string} subjExpanded
 * @property {string} courseNumber
 * @property {string} termTaken
 * @property {number} creditHours
 * @property {string} grade
 * @property {number} spreadsheetIndex - testing variable
 * @memberof typedefs
 *
 * @typedef AdditionalStudent
 * @property {string} emailAddress
 * @property {number} completionTermCode
 * @property {string} citizenCode
 * @property {boolean} transferFlag
 * @property {boolean} cadetFlag
 * @property {string} studentClassDesc
 * @property {boolean} selfReportedVeteranFlag
 * @memberof typedefs
 */

/**
 * parser.js types
 *
 * @typedef StudentInfo - conversion from excel object to db syntax
 * @property {number} id
 * @property {string} name
 * @property {string} standing_message
 * @property {number} admit_term
 * @property {number} current_term
 * @property {string} concentration
 * @property {string} advisor_lname
 * @property {number} overall_hours_attempted
 * @property {number} overall_gpa
 * @property {number} transfer_hours_earned
 * @property {number} in_major_gpa
 * @memberof typedefs
 *
 * @typedef CourseInfo - conversion from excel object to db syntax
 * @property {string} subj_expanded
 * @property {string} course_number
 * @property {string} term_taken
 * @property {number} credit_hours
 * @property {string} grade
 * @property {number} student_id
 * @memberof typedefs
 *
 * @typedef AdditionalStudentInfo
 * @property {number} id
 * @property {string} email_address
 * @property {number} completion_term_code
 * @property {boolean} graduation_ready
 * @property {array} missing_courses
 * @property {string} citizen_code
 * @property {boolean} transfer_flag
 * @property {boolean} cadet_flag
 * @property {string} student_class_desc
 * @property {boolean} self_reported_veteran_flag
 * @memberof typedefs
 */

/**
 * @typedef CourseInput   course inputed from controller 
 * @property {number} course.year
 * @property {string} course.subject
 * @property {string} course.category
 * @property {string} course.course_number
 * @property {number} course.credit_hours
 * @property {boolean} course.repeatable
 * @property {json} course.substitutes
 *
 * @typedef Flag
 * @property {number} student_id
 * @property {number} type                    
 * @property {Course} [associatedCourse]
 *
 * @typedef ParserResult
 * @property {StudentInfo[]} students
 * @property {AdditionalStudentInfo[]} additional
 * @property {Violation[]} flags
 * @property {CourseInfo[]} courses
 *
 */

module.exports.empty = {}
