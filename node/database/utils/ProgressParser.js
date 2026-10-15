const { DB, tableNames } = require("../handler");
const { uploadParserCourseList } = require("./ProgressCourse");
const { uploadParserStudentList, uploadParserAdditionalList, getFullStudentInfo } = require("./ProgressStudent");
const { uploadParserFlagList, getFullViolations } = require("./Violation");
const Log = require("./Log");
const _ = require("lodash");

/**
 * Upload read data to database.
 *
 * NOTE:
 *  - It is legal for any of the result arrays (students, courses, additional)
 *    to be empty. In that case we simply skip the INSERT for that table
 *    instead of generating SQL like `INSERT ... VALUES ;`, which MySQL
 *    rejects with ER_PARSE_ERROR.
 */
module.exports.uploadParserResult = async (audit_id, result) => {
  // Normalise the pieces we care about into arrays.
  const students = Array.isArray(result?.students) ? result.students : [];
  const courses = Array.isArray(result?.courses) ? result.courses : [];
  const additional = Array.isArray(result?.additional) ? result.additional : [];
  // flags are intentionally ignored for PTD (P91-only).

  try {
    if (students.length > 0) {
      await uploadParserStudentList(students, audit_id);
    }

    if (courses.length > 0) {
      await uploadParserCourseList(courses, audit_id);
    }

    if (additional.length > 0) {
      await uploadParserAdditionalList(additional, audit_id);
    }

    // Removing violations for PTD because those are just for P91.
    // if (Array.isArray(result?.flags) && result.flags.length > 0) {
    //   await uploadParserFlagList(result.flags);
    // }

    return Promise.resolve();
  } catch (err) {
    // Surface the error to the caller so the worker can handle/log it.
    return Promise.reject(err);
  }
};
