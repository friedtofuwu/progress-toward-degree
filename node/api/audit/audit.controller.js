const fs = require("fs");
const { getCurrentUser, uniqueSuffix } = require("../helpers");
const { DB } = require("../../database/handler");
const { outputToExcel } = require("../../parser/spreadsheet");
const Log = require("../../database/utils/Log");
const { worker } = require("./audit.import-worker");
const { getAuditInfoById, countProcessedStudents } = require('../../database/utils/AuditInfo');
const auditQueue = require("./audit.queue");
const crypto = require("crypto");


// you'll need to implement these DB utilities similar to SubmissionInfo
const {
  getAuditHistoryByUser,
  getAuditResults,
  getAuditById,
  getAuditFilePath,
  logAudit,
  getAuditAsExcelData,
} = require("../../database/utils/AuditInfo");

const fileTypes = ["XLSX"];
module.exports.uploadPath = require('path').join(require('os').tmpdir(), 'p91-tool', 'audits');
fs.mkdirSync(module.exports.uploadPath, { recursive: true });

let auditImportInfo = null;

module.exports.getAuditStatus = (req, res) => {
  const job = auditQueue.latestByUser.get(getCurrentUser(res)?.pid);
  res.json({
    status: job?.status || 'idle',
    message: job?.status === 'failed'
      ? 'The audit could not be processed. Check both spreadsheet formats and the checksheet year, then try again.'
      : null,
  });
};

module.exports.import = async (req, res) => {
  const currentUserPID = getCurrentUser(res)?.pid;
  Log.info(`Received request to run new audit.`, currentUserPID);

  const file = req.files[0];
  const fullDataFile = req.files[1];

  if (!file || !fullDataFile) {
    for (const uploaded of req.files || []) fs.unlink(uploaded.path, () => {});
    return res.status(400).send({ message: "Must supply two Excel files" });
  }

  if (
    ![file, fullDataFile].every((f) =>
      fileTypes.includes(f.originalname.split(".").pop().toUpperCase())
    )
  ) {
    return res.status(400).send({ message: "Uploaded files must be XLSX." });
  }

  // NEW: normalize optional filters from multipart form body
  const body = req.body || {};

  const advisorFilterRaw = (body.advisor_lname || "").trim();
  const concentrationsRaw = (body.concentrations || "").trim();
  const gradTermsRaw = (body.grad_terms || "").trim();

  const filters = {
    // treat missing or "ALL" as "no filter"
    advisor_lname:
      advisorFilterRaw && advisorFilterRaw.toUpperCase() !== "ALL"
        ? advisorFilterRaw
        : null,
    concentrations:
      concentrationsRaw && concentrationsRaw.toUpperCase() !== "ALL"
        ? concentrationsRaw
        : null,
    grad_terms:
      gradTermsRaw && gradTermsRaw.toUpperCase() !== "ALL"
        ? gradTermsRaw
        : null,
  };

  auditImportInfo = {
    details: {
      initiatingUser: currentUserPID,
      parserWarnings: [],
      errorMessage: null,
      progressMsg: "Queued for processing...",
      filters, // NEW
    },
    file,
    fullDataFile,
  };

  // Generate unique job ID
  const jobId = crypto.randomBytes(16).toString("hex");

  // Create job object
  const job = {
    id: jobId,
    auditImportInfo,
    details: auditImportInfo.details,
    worker: worker,
    onSuccess: () => {
      Log.info(`Audit job ${jobId} completed successfully`, currentUserPID);
    },
    onError: (error) => {
      Log.error(`Audit job ${jobId} failed: ${error.message}`, currentUserPID);
    }
  };

  try {
    // Add to queue
    const queueResult = await auditQueue.enqueue(job);
    
    Log.info(`Audit queued: job=${jobId}, position=${queueResult.position}, queue length=${queueResult.queueLength}`, currentUserPID);
    
    return res.status(202).send({
      message: "Audit queued for processing",
      jobId: queueResult.jobId,
      position: queueResult.position,
      queueLength: queueResult.queueLength,
      estimatedWaitTime: queueResult.estimatedWaitTime
    });
  } catch (err) {
    Log.error(`Error queuing audit: ${err.message}`, currentUserPID);
    return res.status(500).send({ message: `Failed to queue audit: ${err.message}` });
  }
};


// Generate and send processed spreadsheet for a given audit_id
module.exports.exportAuditFile = async (req, res) => {
  const auditId = req.params.audit_id;
  const currentUserPID = getCurrentUser(res)?.pid;

  try {
    // Confirm audit exists
    const auditInfo = await getAuditById(auditId);
    if (!auditInfo) {
      return res.status(404).send({ message: "Audit not found" });
    }

    // Ensure upload directory exists
    if (!fs.existsSync(module.exports.uploadPath)) {
      fs.mkdirSync(module.exports.uploadPath, { recursive: true });
    }

    // Generate tmp filename
    const exportFilename = `audit-${auditId}-${uniqueSuffix()}.xlsx`;
    const exportFilepath = module.exports.uploadPath + "/" + exportFilename;

    // Get audit results from DB in Excel format
    const xlsxData = await getAuditAsExcelData(auditId);

    // Generate Excel file
    await outputToExcel(xlsxData, exportFilepath);

    // Send for download
    return res.download(exportFilepath, (err) => {
      if (err) {
        Log.error(
          `Error sending audit export file ${exportFilepath}:`,
          currentUserPID,
          err
        );
      }

      // Clean up temp file
      fs.unlink(exportFilepath, (unlinkErr) => {
        if (unlinkErr) {
          Log.error(
            `Error deleting temp audit export file:`,
            currentUserPID,
            unlinkErr
          );
        }
      });
    });
  } catch (err) {
    Log.error(
      "Audit export: Error generating audit Excel:",
      currentUserPID,
      err
    );
    return res
      .status(500)
      .send({ message: "Error generating audit Excel file" });
  }
};

/**
 * /GET api/audit/history/<pid>
 * Sends JSON list of audits for req.params.pid (GET /api/audit/history/:pid).
 * 
 * @param {*} req 
 * @param {*} res 
 * @returns List that includes a boolean graduation flag and a parsed list of missing courses.
 */
module.exports.getAuditHistory = async (req, res) => {
    // Read the PID out of the route parameter
    const pid = process.env.DEMO_MODE === 'true' ? getCurrentUser(res)?.pid : req.params.pid;
    try {
        // Ask the DB util for this user's audit history
        const history = await getAuditHistoryByUser(pid);

        // Return a 200 with the history array wrapped in an object
        res.status(200).json({ history });
    } catch (err) {
        // On any error, send a generic 500
        return res.status(500).send({ message: "Error retrieving audit history" });
    }
};

// module.exports.getAuditHistory = async (req, res) => {
//   const pid = req.params.pid;
//   try {
//     const history = await getAuditHistoryByUser(pid);
//     res.status(200).json({ history });
//   } catch (err) {
//     return res.status(500).send({ message: "Error retrieving audit history" });
//   }
// };

/**
 * /GET /api/audit/:audit_id
 * Fetches all students for a given audit and converts the DB’s raw values into clean JSON
 * 
 * @param {*} req 
 * @param {*} res 
 * @returns List that includes a boolean graduation flag and a parsed list of missing courses.
 */
module.exports.getAuditResults = async (req, res) => {
    // 1. Get the audit ID from the param
    const auditId = req.params.audit_id;
    try {
        // 2. Grab the raw rows form the database
        const results = await getAuditResults(auditId);
        // 3. Shape the response for the client:
        //  - Parse 'missing_courses' from JSON text --> Array (fallback to [])
        //  - Normalize 'graduation_ready' to true/false
        const rows = (results || []).map(r => ({
            ...r,
            graduation_ready: r?.graduation_ready === 1 || r?.graduation_ready === true, // Normalizing graduation_ready to true/false
            transfer_flag: r?.transfer_flag === 1 || r?.transfer_flag === true, // Normalizing transfer_flag to true/false
            cadet_flag: r?.cadet_flag === 1 || r?.cadet_flag === true, // Normalizing cadet_flag to true/false
            self_reported_veteran_flag: r?.self_reported_veteran_flag === 1 || r?.self_reported_veteran_flag === true // Normalizing self_reported_veteran_flag to true/false
          }));
        // 4. Only grab unique (non-duplicate) rows
        const seen = new Set();
        const unique = [];
        for (const r of rows) {
            if (!seen.has(r.id)) {
                seen.add(r.id);
                unique.push(r);
            }
        }
        // 5. Return clean JSON to the client
        res.status(200).json(unique);
    } catch (err) {
        // 6. Fallback error path
        return res.status(500).send({ message: "Error retrieving audit results" });
    }
};

/** Sends live status for a single audit (GET /api/audit/:audit_id/info). */
module.exports.getAuditRunInfo = async (req, res) => {
  const auditId = Number(req.params.audit_id);
  if (!Number.isFinite(auditId)) {
    return res.status(400).json({ message: 'Invalid audit id' });
  }
  try {
    const info = await getAuditInfoById(auditId);              // from Audit_Info
    if (!info) return res.status(404).json({ message: 'Audit not found' });

    const processed = await countProcessedStudents(auditId);    // DISTINCT students written so far
    const total = info?.num_students || null;                   // may be null/0 until set
    const completed = info?.processing_time_ms != null && info.processing_time_ms >= 0;

    // Minimal state machine
    const status =
      completed ? 'completed'
      : (info?.error ? 'failed'
      : (processed > 0 ? 'running' : 'queued'));

    const progress = total ? processed / total : null;

    // finished_at (derive from start + processing_time_ms when completed)
    const startedAt = info.timestamp;
    const finishedAt = completed
      ? new Date(new Date(startedAt).getTime() + info.processing_time_ms).toISOString()
      : null;

    return res.status(200).json({
      audit_id: auditId,
      status,
      processed_students: processed,
      total_students: total,
      progress,
      started_at: startedAt,
      finished_at: finishedAt,
      processing_time_ms: completed ? info.processing_time_ms : null,
      filename: info.filename || null,
      num_incomplete_degree_students: completed ? info.num_incomplete_degree_students : null,
      error: info?.error || null
    });
  } catch (e) {
    return res.status(500).json({ message: 'Error retrieving audit info' });
  }
};


// module.exports.getAuditResults = async (req, res) => {
//   const auditId = req.params.audit_id;
//   try {
//     const results = await getAuditResults(auditId);
//     res.status(200).json(results);
//   } catch (err) {
//     return res.status(500).send({ message: "Error retrieving audit results" });
//   }
// };
