const { DB, tableNames } = require("../handler");
const Log = require("../utils/Log");
var _ = require("lodash");
const typedefs = require("../../helpers/typedefs");

/**
 * This class is a repository for the Checksheet table
 *
 * Handles API calls from checksheet.controller and
 * backend-to-backend checksheet queries such as checking
 * for p91 violations and graduation requirements
 */

/**
 * Note: async functions will always return a promise resolved
 */

/**
 * Gets classes from year
 *
 * @param {String} year         year to query
 * @param {String} category     optional category to find
 *
 * @return {Promise}   message and status code
 */
module.exports.getYear = async (year, category) => {
  let selectCategory = "";
  if (category) {
    selectCategory = ` AND category=\'${category}\'`;
  }

  const query =
    `SELECT * FROM ${tableNames.checksheet} WHERE year=${year}` +
    selectCategory;

  Log.info(query);

  try {
    const result = await DB.query(query);
    const sorted = _.groupBy(result.result, "category");
    sorted["year"] = year;
    return {
      result: sorted,
      status: 200,
    };
  } catch {
    return {
      result: [],
      status: 500,
    };
  }
};

/**
 * Gets years as list of numbers
 *
 * @return {Promise}   message and status code
 */
module.exports.getYearNumbers = async () => {
  const query = `SELECT DISTINCT year FROM ${tableNames.checksheet}`;

  Log.info(query);

  try {
    const result = await DB.query(query);
    return {
      result: result.result,
      status: 200,
    };
  } catch {
    return {
      result: [],
      status: 500,
    };
  }
};

/**
 * Copies all courses from yearA to yearB
 *
 * @param {object} years
 * @param {number} years.pastYear - year specified to mimic
 * @param {number} years.newYear - year specified for creation
 *
 * @return {Promise}   message and status code
 */
module.exports.copyCourse = async (years) => {
  try {
    const queryForPast = `SELECT * FROM ${tableNames.checksheet} WHERE year=${years.pastYear}`;
    const result = await DB.query(queryForPast);

    let newYearCourses = result.result.map((course) => {
      return {
        ...course,
        year: years.newYear,
      };
    });

    for (let course of newYearCourses) {
      await DB.insert(tableNames.checksheet, course);
    }

    return {
      result: newYearCourses,
      status: 200,
    };
  } catch (err) {
    return {
      result: `error copying: ${err}`,
      status: 500,
    };
  }
};

/**
 * Add a course to the Checksheet
 *
 * @param {typedefs.CourseInput}
 *
 * @return {Promise}   message and status code
 */
module.exports.addCourse = async (course) => {
  try {
    await DB.insert(tableNames.checksheet, course);
    return {
      result: "ok",
      status: 200,
    };
  } catch (err) {
    return {
      result: `internal occurred while inserting: ${err}`,
      status: 500,
    };
  }
};

/**
 * Delete courses from the Checksheet
 *
 * @param {typedefs.CourseInput[]} courses
 *
 * @return {Promise}   message and status code
 */
module.exports.deleteCourses = async (courses) => {
  try {
    let classesDeleted = [];
    for (let course of courses) {
      const params = `year=${course.year} AND subject=\'${course.subject}\' AND course_number=${course.course_number}`;
      const query = `DELETE FROM ${tableNames.checksheet} WHERE ${params}`;
      classesDeleted.push(
        `${course.year} ${course.subject}${course.course_number}`
      );
      await DB.query(query);
    }

    return {
      result: classesDeleted.join(", "),
      status: 200,
    };
  } catch (err) {
    return {
      result: "internal occurred while deleting",
      status: 500,
    };
  }
};

/**
 * Get course identifiers for a specific category and year for filtering
 *
 * @param {String} year         year to query
 * @param {String} category     category to filter (e.g., 'core', 'cs')
 *
 * @return {Promise}   list of course identifiers and status code
 */
module.exports.getCategoryCoursesForFilter = async (year, category) => {
  const query = `SELECT subject, course_number, substitutes FROM ${tableNames.checksheet} WHERE year=${year} AND category='${category}'`;

  Log.info(query);

  try {
    const result = await DB.query(query);
    // Return array of course identifiers like "CS1114", "CS2114", etc.
    const courseIdentifiers = result.result
      .map((course) => {
        const mainCourse = `${course.subject}${course.course_number}`;
        let allCourses = [mainCourse];

        // Add substitutes if they exist
        if (course.substitutes) {
          try {
            let substitutes = course.substitutes;
            
            if (typeof substitutes === 'string') {
              if (substitutes === '[]') {
                return allCourses;
              }
              substitutes = JSON.parse(substitutes);
            }
            if (Array.isArray(substitutes) && substitutes.length > 0) {
              const subCourses = substitutes.map(
                (sub) => `${sub.subject}${sub.course_number}`
              );
              allCourses = allCourses.concat(subCourses);
            }
          } catch (e) {
            Log.warn(`Failed to parse substitutes for ${mainCourse}: ${e}`);
          }
        }

        return allCourses;
      })
      .flat();

    return {
      result: courseIdentifiers,
      status: 200,
    };
  } catch (err) {
    Log.error(`Error fetching category courses: ${err}`);
    return {
      result: [],
      status: 500,
    };
  }
};
