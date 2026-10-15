const fs = require('fs');
const { getCurrentUser, uniqueSuffix } = require("../helpers");
const { getFullSubmissionHistory, getLatestSubmissionInfo } = require('../../database/utils/SubmissionInfo');
const { outputToExcel } = require('../../parser/spreadsheet');
const { getLastRunAsExcelData } = require('../../database/utils/Parser');
const { DB } = require('../../database/handler');
const Log = require('../../database/utils/Log');
const { worker } = require('./submission.import-worker');
const submissionQueue = require('./submission.queue');
const crypto = require('crypto');


// File upload
const fileTypes = ["XLSX"];
module.exports.uploadPath = "/tmp/p91-tool/uploads";

// Flag to prevent multiple submission requests at once. Available to lock when
// false, locked when true.
var submissionImportInfo = null;

module.exports.getImportStatus = (req, res) => {
    const queueStatus = submissionQueue.getStatus();

    res.status(200).send({
        isProcessing: queueStatus.isProcessing,
        currentJob: queueStatus.currentJob,
        queueLength: queueStatus.queueLength,
        queuedJobs: queueStatus.queuedJobs,
        info: submissionImportInfo?.details || null
    });
}

// Handle spreadsheet file upload.
module.exports.import = async (req, res) => {
    const currentUserPID = getCurrentUser(res)?.pid;
    Log.info(`Received request to import a new submission.`, currentUserPID);

    const file = req.files[0];
    const fullDataFile = req.files[1];

    // Verify input
    if (!file) {
        Log.info(`Submission import: Abort: No input file was provided.`, currentUserPID);
        return res.status(400).send({ message: "Must supply an input file" });
    } else if (!fileTypes.includes(file.originalname.split('.').pop().toUpperCase())) {
        Log.info(`Submission import: Abort: Input file was not XLSX.`, currentUserPID);
        return res.status(400).send({ message: "File uploaded was not XLSX." });
    }

    // Initialize import info
    submissionImportInfo = {
        details: {
            initiatingUser: currentUserPID,
            parserWarnings: [],
            errorMessage: null,
            progressMsg: "Queued for processing..."
        },
        file: file,
        fullDataFile: fullDataFile
    }

    // Generate unique job ID
    const jobId = crypto.randomBytes(16).toString('hex');

    // Create job object
    const job = {
        id: jobId,
        submissionImportInfo,
        details: submissionImportInfo.details,
        worker: worker,
        onSuccess: () => {
            Log.info(`Submission job ${jobId} completed successfully`, currentUserPID);
        },
        onError: (error) => {
            Log.error(`Submission job ${jobId} failed: ${error.message}`, currentUserPID);
        }
    };

    try {
        // Add to queue
        const queueResult = await submissionQueue.enqueue(job);
        
        Log.info(`Submission queued: job=${jobId}, position=${queueResult.position}, queue length=${queueResult.queueLength}`, currentUserPID);
        
        return res.status(202).send({
            message: "Submission queued for processing",
            jobId: queueResult.jobId,
            position: queueResult.position,
            queueLength: queueResult.queueLength,
            estimatedWaitTime: queueResult.estimatedWaitTime
        });
    } catch (err) {
        Log.error(`Error queuing submission: ${err.message}`, currentUserPID);
        return res.status(500).send({ message: `Failed to queue submission: ${err.message}` });
    }
};

// Generate and send processed spreadsheet for latest submission for download.
module.exports.export = (req, res) => {
    const currentUserPID = getCurrentUser(res)?.pid;
    Log.info(`Received request to export the latest submission.`, currentUserPID);

    // Attain the lock to process
    if (!DB.attemptLock()) {
        Log.info(`Submission export: Abort: Submission lock is held by someone else.`, currentUserPID);
        return res.status(400).send({
            message: "A submission is currently being processed. Please try again in a moment."
        });
    }

    // Get the information for this export
    getLatestSubmissionInfo().then((submissionInfo) => {
        // Generate tmp filename
        const exportFilename = "export" + uniqueSuffix();
        const exportFilepath = module.exports.uploadPath + "/" + exportFilename;

        // Retrieve database data in an Excel-ready format
        Log.info(`Submission export: Retrieving latest submission data from the database...`, currentUserPID);
        getLastRunAsExcelData(false).then((xlsxRows) => {
            // Generate file
            Log.info(`Submission export: Generating an Excel file based on the submission data...`, currentUserPID);
            outputToExcel(xlsxRows, exportFilepath).then(() => {
                Log.info(`Submission export: Created temporary output file at '${exportFilepath}'.`, currentUserPID);

                // Done getting data from database
                DB.unlock();

                // Send Excel file back for download
                Log.info(`Submission export: Sending export Excel file back...`, currentUserPID);
                return res.download(exportFilepath, (err) => {
                    if (err) {
                        Log.error(`Error sending submission export file for download at '${exportFilepath}':`, currentUserPID, err);
                    }

                    Log.info(`Submission export: Done.`, currentUserPID);

                    // Delete cached output file from disk
                    fs.unlink(exportFilepath, (err) => {
                        if (err) {
                            Log.error(`Error deleting submission export file at '${exportFilepath}':`, currentUserPID, err);
                        }
                        Log.info(`Submission export: Deleted temporary output file at '${exportFilepath}'.`, currentUserPID);
                    });
                });
            }).catch((err) => {
                DB.unlock();
                Log.error('Submission export: Error writing Excel file:', currentUserPID, err);
                return res.status(500).send({
                    message: "Something went wrong when generating the Excel output file."
                });
            });
        }).catch(() => {
            // Any errors were logged in getLastRunAsExcelData()
            DB.unlock();
            return res.status(500).send({
                message: "Something went wrong when retrieving the last run from the database."
            });
        })
    }).catch((err) => {
        DB.unlock();
        Log.error('Submission export: Error getting most recent submission info:', currentUserPID, err);
        return res.status(500).send({
            message: "Some error occurred while the most recent submission"
        });
    })
};

module.exports.getSubmissionHistory = (req, res) => {
    getFullSubmissionHistory().then((result) => {
        res.status(200).json({
            history: result
        });
    }).catch((err) => {
        Log.error('Error getting submission history:', getCurrentUser(res)?.pid, err);
        return res.status(500).send({
            message: "Some error occurred while getting submission history"
        });
    })
}
