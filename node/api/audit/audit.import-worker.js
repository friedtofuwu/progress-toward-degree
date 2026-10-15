const fs = require('fs');
const { logAudit, updateAuditStats, deleteAudit } = require("../../database/utils/AuditInfo");
const { analyzeStudents } = require("../../parser/parser");

// use the real function names from parser/spreadsheet.js
const {
  readCourseExcelFile,
  readFullDataExcelFile,
} = require("../../parser/spreadsheet");

const { uploadParserResult } = require("../../database/utils/ProgressParser");
const Log = require('../../database/utils/Log');
const { DB } = require('../../database/handler');
const _ = require('lodash');

module.exports.worker = async (auditInfo) => {
  const file = auditInfo.file;
  const fullDataFile = auditInfo.fullDataFile;
  const currentUserPID = auditInfo.details.initiatingUser;
  const filters = (auditInfo.details && auditInfo.details.filters) || {};

  let auditId = null;

  try {
    const couldConnect = await DB.init();
    if (!couldConnect) {
      throw new Error(`Could not connect to the database from the worker thread`);
    }

    Log.info("Audit import: Connected to the database in the worker thread.", currentUserPID);

    // Insert initial audit record (with placeholder stats)
    try {
      auditId = await logAudit(
        currentUserPID || null,
        file.originalname,
        -1, // processing_time placeholder
        -1, // num_students placeholder
        -1  // num_incomplete_degree_students placeholder
      );
      Log.info(`Audit import: Created audit record with id ${auditId}`, currentUserPID);
    } catch (err) {
      Log.error("Audit import: Failed to insert initial audit record", currentUserPID, err);
      throw err;
    }

    // Mark beginning of analysis
    const startTimeMs = new Date();

    let students;
    let extraStudentInfoFields;

    if (file) {
      try {
        Log.info(`Audit import: Reading Progress Excel file...`, currentUserPID);
        // these helpers are synchronous
        students = readCourseExcelFile(file.path);
      } catch (err) {
        Log.error('Audit import: Failed to read Progress Excel file:', currentUserPID, err);
        throw err;
      }
    }

    if (fullDataFile) {
      try {
        Log.info(`Audit import: Reading Full Data Excel file...`, currentUserPID);
        // synchronous
        extraStudentInfoFields = readFullDataExcelFile(fullDataFile.path);
      } catch (err) {
        Log.error('Audit import: Failed to read Full Data Excel file:', currentUserPID, err);
        throw err;
      }
    }

    // Parse student data
    // Parse student data
    Log.info(`Audit import: Analyzing student data...`, currentUserPID);
    const result = await analyzeStudents(students, extraStudentInfoFields, filters);
    Log.info(`Audit import: Done analyzing student data.`, currentUserPID);


    // Upload parsed results tied to this audit_id
    try {
      Log.info(`Audit import: Uploading audit results to database...`, currentUserPID);
      await uploadParserResult(auditId, result);
    } catch (err) {
      Log.error('Audit import: Error uploading audit results:', currentUserPID, err);
      throw err;
    }

    // Compute stats
    const timeDiffMs = new Date() - startTimeMs;
    const numStudents = Array.isArray(result?.students) ? result.students.length : 0;

    // PTD has no violations now; guard for undefined
    const numFlaggedStudents = Array.isArray(result?.flags)
      ? _.uniqBy(result.flags, 'student_id').length
      : 0;

    // Update the audit record with final stats
    try {
      await updateAuditStats(auditId, timeDiffMs, numStudents, numFlaggedStudents);
      Log.info(`Audit import: Updated audit ${auditId} with stats.`, currentUserPID);
    } catch (err) {
      Log.error('Audit import: Error updating audit stats:', currentUserPID, err);
      throw err;
    }

  } catch (err) {
    // If auditId exists but we failed before finishing, delete it
    if (auditId) {
      try {
        await deleteAudit(auditId);
        Log.info(`Audit import: Rolled back audit ${auditId} due to failure.`, currentUserPID);
      } catch (cleanupErr) {
        Log.error(`Audit import: Failed to delete incomplete audit ${auditId}`, currentUserPID, cleanupErr);
      }
    }
    return Promise.reject(err);
  } finally {
    // Delete cached input files
    fs.unlink(file.path, (err) => {
      if (err) {
        Log.error('Audit import: Error deleting temporary file:', currentUserPID, err);
      }
      Log.info(`Audit import: Deleted temporary input file at '${file.path}'`, currentUserPID);
    });
    fs.unlink(fullDataFile.path, (err) => {
      if (err) {
        Log.error('Audit import: Error deleting temporary file:', currentUserPID, err);
      }
      Log.info(`Audit import: Deleted temporary input file at '${fullDataFile.path}'`, currentUserPID);
    });
  }

  return Promise.resolve();
};
