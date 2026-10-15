const fs = require('fs');
const { getCurrentUser } = require("../helpers");
const { getAllLogs, getLogsByUserPID } = require('../../database/utils/Log');
const Log = require('../../database/utils/Log');
const logPath = "/tmp/p91-tool/logs";
const moment = require('moment-timezone');


/**
 * Retrieve all logs
 * @param {*} req 
 * @param {*} res 
 * @returns Download a file containing all logs from the database
 * @throws 500 if there is an error retrieving logs
 * @throws 500 if there is an error creating logs
 * @throws 500 if there is an error downloading logs
 * @throws 500 if there is an error deleting logs
 * 
 */
exports.getAll = (req, res) => {
    Log.info(`Received request to get all logs.`, getCurrentUser(res)?.pid);
    getAllLogs()
        .then(logs => {
            if (!fs.existsSync(logPath)) {
                fs.mkdirSync(logPath);
            }
            const logFileName = `${logPath}/all-${Date.now()}.log`;
            Log.info(`Creating log file ${logFileName}.`, getCurrentUser(res)?.pid);
            // Create a write stream
            const logStream = fs.createWriteStream(logFileName, { flags: 'a' });
            const timezone = req.query.timezone ? req.query.timezone : "America/New_York";
            const maxLength = Math.max(...logs.map(log => log.pid?.length || 0));
            logs.forEach((log) => {
                const timestamp = moment(log.timestamp).tz(timezone);
                const pid = `[${log.pid}]`.padEnd(maxLength + 2);
                const severity = `[${log.severity.toUpperCase()}]`.padEnd(9);
                const logString = `[${timestamp.format()} ${timestamp.format('z')}] ${pid} ${severity} ${log.action}`;
                logStream.write(logString + "\n");
            })
            logStream.end();
            logStream.on('finish', () => {
                Log.info(`All logs created.`, getCurrentUser(res)?.pid);
                // Send file
                return res.download(logFileName, (err) => {
                    if (err) {
                        Log.error('Error downloading all logs:', getCurrentUser(res)?.pid, err);
                    } else {
                        Log.info(`All logs downloaded.`, getCurrentUser(res)?.pid);
                    }
                    // Delete the file
                    fs.unlink(logFileName, (err) => {
                        if (err) {
                            Log.error('Error deleting all logs:', getCurrentUser(res)?.pid, err);
                        } else {
                            Log.info(`All logs deleted.`, getCurrentUser(res)?.pid);
                        }
                    });
                });
            }).on('error', (err) => {
                Log.error('Error creating all logs:', getCurrentUser(res)?.pid, err);
                res.status(500).send({
                    message: err.message || "Error creating all logs"
                });
            });
        })
        .catch(err => {
            Log.error('Error getting all logs:', getCurrentUser(res)?.pid, err);
            res.status(500).send({
                message: err.message || "Error retrieving logs"
            });
        });
};

/**
 * Retrieve logs of a single user
 * @param {*} req 
 * @param {*} res 
 * @returns Download a file containing logs of a single user from the database
 * @throws 400 if no PID is provided
 * @throws 404 if no logs are found
 * @throws 500 if there is an error retrieving logs
 * @throws 500 if there is an error creating logs
 * @throws 500 if there is an error downloading logs
 * @throws 500 if there is an error deleting logs
 */
exports.getOneByPID = (req, res) => {
    if (!req.params.pid) {
        Log.warn(`Received request to get logs with no PID provided.`, getCurrentUser(res)?.pid);
        return res.status(400).send({
            message: "PID can not be empty"
        });
    }
    Log.info(`Received request to get logs of PID ${req.params.pid}.`, getCurrentUser(res)?.pid);
    getLogsByUserPID(req.params.pid).then((result) => {
        if (result === null) {
            Log.warn(`Logs of PID ${req.params.pid} not found.`, getCurrentUser(res)?.pid);
            res.status(404).send({
                message: "Logs not found."
            });
        } else {
            if (!fs.existsSync(logPath)) {
                fs.mkdirSync(logPath);
            }
            const logFileName = `${logPath}/${req.params.pid}-${Date.now()}.log`;
            Log.info(`Creating log file ${logFileName} for ${req.params.pid}.`, getCurrentUser(res)?.pid);
            // Create a write stream
            var logStream = fs.createWriteStream(logFileName, { flags: 'a' });
            const timezone = req.query.timezone ? req.query.timezone : "America/New_York";
            result.forEach((log) => {
                const timestamp = moment(log.timestamp).tz(timezone);
                const severity = `[${log.severity.toUpperCase()}]`.padEnd(9);
                const logString = `[${timestamp.format()} ${timestamp.format('z')}] [${log.pid}] ${severity} ${log.action}`;
                logStream.write(logString + "\n");
            })
            logStream.end();
            logStream.on('finish', () => {
                Log.info(`Logs of PID ${req.params.pid} created.`, getCurrentUser(res)?.pid);
                // Send file
                return res.download(logFileName, (err) => {
                    if (err) {
                        Log.error(`Error downloading logs of PID ${req.params.pid}:`, getCurrentUser(res)?.pid, err);
                    } else {
                        Log.info(`Logs of PID ${req.params.pid} downloaded.`, getCurrentUser(res)?.pid);
                    }
                    // Delete the file
                    fs.unlink(logFileName, (err) => {
                        if (err) {
                            Log.error(`Error deleting logs of PID ${req.params.pid}:`, getCurrentUser(res)?.pid, err);
                        } else {
                            Log.info(`Logs of PID ${req.params.pid} deleted.`, getCurrentUser(res)?.pid);
                        }
                    });
                });
            }).on('error', (err) => {
                Log.error(`Error creating logs of PID ${req.params.pid}:`, getCurrentUser(res)?.pid, err);
                res.status(500).send({
                    message: err.message || "Error creating logs of PID " + req.params.pid
                });
            });
        }
    }).catch((err) => {
        Log.error(`Error getting logs of PID ${req.params.pid}:`, getCurrentUser(res)?.pid, err);
        res.status(500).send({
            message: err.message || "Error retrieving logs of PID " + req.params.pid
        });
    });
};