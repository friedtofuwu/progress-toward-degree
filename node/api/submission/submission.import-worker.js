const fs = require('fs');
const { logSubmission } = require("../../database/utils/SubmissionInfo");
const { analyzeStudents } = require("../../parser/parser");
const { readCourseExcelFile, readFullDataExcelFile } = require("../../parser/spreadsheet");
const { clearMostRecentRun, uploadParserResult } = require("../../database/utils/Parser");
const Log = require('../../database/utils/Log');
const { DB } = require('../../database/handler');
const _ = require('lodash');

/**
 * This is a worker that orchestrates the process of file submission and
 * student processing
 */


module.exports.worker = async (submissionInfo) => {
    // Get worker thread data
    // let importInfo = workerData?.importInfo;
    const file = submissionInfo.file;
    const fullDataFile = submissionInfo.fullDataFile;
    const currentUserPID = submissionInfo.details.initiatingUser;

    try {
        const couldConnect = await DB.init()

        if (couldConnect) {
            Log.info("Submission import: Connected to the database in the worker thread.", currentUserPID);

            // Mark beginning of analysis
            const startTimeMs = new Date();

            if (file) {
                // Get student data and associated courses from imported Excel file
                var students;
                try {
                    Log.info(`Submission import: Reading Progress Excel file...`, currentUserPID);
                    students = readCourseExcelFile(file.path);
                } catch (err) {
                    Log.error('Submission import: Failed to read Progress Excel file:', currentUserPID, err);
                    throw err;
                }      
                Log.warn("Student Regular:");
                //console.log(students);    
            }          

            if (fullDataFile) {
                // Get full/extra student data and associated courses from imported Excel file
                var extraStudentInfoFields;
                try {
                    Log.info(`Submission import: Reading Full Data Excel file...`, currentUserPID);
                    extraStudentInfoFields = readFullDataExcelFile(fullDataFile.path);
                } catch (err) {
                    Log.error('Submission import: Failed to read Full Data Excel file:', currentUserPID, err);
                    throw err;
                }
                Log.warn("Extra Student Info Fields:");
                console.log(extraStudentInfoFields);
            }
            
            // Parse student data
            Log.info(`Submission import: Analyzing student data...`, currentUserPID);
            try {
                const result = await analyzeStudents(students, extraStudentInfoFields);

                Log.info(`Submission import: Done analyzing student data.`, currentUserPID);

                // Clear data from the previous run
                try {
                    Log.info(`Submission import: Clearing the previous submission run...`, currentUserPID);
                    await clearMostRecentRun();
                } catch (err) {
                    Log.error('Error clearing the previous submission run:', null, err);
                    importInfo.details.errorMessage = 'Something went wrong when clearing the last run in the database.';
                    throw err;
                }

                // Upload parsed data to database
                try {
                    Log.info(`Submission import: Uploading the submission results to the database...`, currentUserPID);
                    Log.info("Updating the database with submission results...");
                    await uploadParserResult(result);
                } catch (err) {
                    // Error logged from inside uploadParserResult()
                    importInfo.details.errorMessage = 'Something went wrong when uploading the processed submission to the database.';
                    throw err;
                }

                // Mark end of analysis
                const timeDiffMs = new Date() - startTimeMs;

                // Get number of students and students flagged
                const numStudents = result.students.length;
                const numFlaggedStudents = _.uniqBy(result.flags, 'student_id').length;

                // Done processing submission
                Log.info(`Submission import: Adding submission log...`, currentUserPID);
                try {
                    await logSubmission(currentUserPID || null, file.originalname, timeDiffMs, numStudents, numFlaggedStudents);
                    Log.info(`Submission import: Done.`, currentUserPID);
                } catch (err) {
                    Log.error('Submission import: Error while adding submission log:', currentUserPID, err);
                    throw err
                }
            } catch (err) {
                Log.error('Submission import: Error analyzing student data:', currentUserPID, err);
                throw err
            }         
        } else {
            throw new Error(`Could not connect to the database from the worker thread:`);
        }
    }
    catch (err) {
        return Promise.reject(err)
    }
    finally {
        // Delete cached input file from disk
        fs.unlink(file.path, (err) => {
            if (err) {
                Log.error('Submission import: Error deleting temporary file:', currentUserPID, err);
            }
            Log.info(`Submission import: Deleted temporary input file at '${file.path}'`, currentUserPID);
        });
        fs.unlink(fullDataFile.path, (err) => {
            if (err) {
                Log.error('Submission import: Error deleting temporary file:', currentUserPID, err);
            }
            Log.info(`Submission import: Deleted temporary input file at '${fullDataFile.path}'`, currentUserPID);
        });
    }

    return Promise.resolve()

}

