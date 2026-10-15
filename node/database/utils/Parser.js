const { DB, tableNames } = require("../handler");
const { uploadParserCourseList } = require("./Course");
const { uploadParserStudentList, uploadParserAdditionalList, getFullStudentInfo } = require("./Student");
const { uploadParserFlagList, getFullViolations } = require("./Violation");
const Log = require("./Log");
const _ = require('lodash')

// List of tables that store the data for the most recent run
const runDataTables = [
    tableNames.violationCourse, tableNames.violation,
    tableNames.course, tableNames.student, tableNames.additional
];

/**
 * Clears the tables in the database corresponding to the latest submission
 * results.
 */
module.exports.clearMostRecentRun = () => {
    return new Promise(async (resolve, reject) => {
        for (let runDataTable of runDataTables) {
            try {
                await DB.clearTable(runDataTable);
            } catch (err) {
                return reject(err)
            }
        }
        return resolve();
    })
}

/**
 * Upload read data to database 
 */
module.exports.uploadParserResult = async (result) => {
    try {
        await uploadParserStudentList(result.students)
        await uploadParserCourseList(result.courses)
        await uploadParserAdditionalList(result.additional)
        await uploadParserFlagList(result.flags)
        return Promise.resolve()
    }
    catch (err) {
        Promise.reject(err)
    }
}


/**
 * Retrieve the last run from the database as data ready to be output to Excel
 */
module.exports.getLastRunAsExcelData = () => {
    return new Promise(async (resolve, reject) => {
        // Declare return value
        let xlsxRows = {};

        const result = await getFullStudentInfo().catch(err => reject(err))
        const violations = await getFullViolations().catch(err => reject(err))

        xlsxRows['Full Analysis'] = result

        const grouped = _.groupBy(result, 'advisor_lname') 
        const groupedViolations = _.groupBy(violations, 'student_id')

        for (let advisor in grouped) {
            xlsxRows[advisor] = grouped[advisor]
        }

        resolve({ sheets: xlsxRows, violations: groupedViolations })
    })
}
