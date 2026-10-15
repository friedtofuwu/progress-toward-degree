const { DB, tableNames } = require('../handler')

class Log {
    constructor({ pid, action, timestamp, severity }) {
        this.pid = pid;
        this.action = action;
        this.timestamp = timestamp;
        this.severity = severity;
    }
    toJSON() {
        return {
            pid: this.pid,
            action: this.action,
            timestamp: this.timestamp,
            severity: this.severity
        }
    }
}
module.exports.Log = Log;

/**
 * Adds a log to the Log table.
 * 
 * @param {String} action A string describing the action that was taken.
 * @param {String} severity One of 'info', 'warning', or 'error'. Defaults to
 *                          'info'.
 * @param {String} pid The PID of the user that performed the action, or null if
 *                     the action is not associated with any one user. Defaults
 *                     to null.
 */
module.exports.log = (action, severity = 'info', pid = null) => {
    let logStr;
    switch (severity) {
        case 'warning':
            logStr = "WARN";
            break;
        case 'error':
            logStr = "ERR";
            break;
        default:
            logStr = "INFO";
            break;
    }
    console.log(`[${logStr}]${pid ? ` (${pid})` : ''} ${action}`);

    DB.insert(
        tableNames.log, pid ? { pid, action, severity } : { action, severity }, []
    ).catch((err) => console.error(
        `[ERROR] Error inserting log into the \`${tableNames.log}\` table:`,
        err
    ))

}

/**
 * Adds an info log to the Log table.
 * 
 * @param {String} action A string describing the action that was taken.
 * @param {String} pid The PID of the user that performed the action, or null if
 *                     the action is not associated with any one user. Defaults
 *                     to null.
 */
module.exports.info = (action, pid = null) => module.exports.log(action, 'info', pid);

/**
 * Adds a warning log to the Log table.
 * 
 * @param {String} action A string describing the warning.
 * @param {String} pid The PID of the user that performed the action, or null if
 *                     the action is not associated with any one user. Defaults
 *                     to null.
 */
module.exports.warn = (action, pid = null) => module.exports.log(action, 'warning', pid);

/**
 * Adds an error log to the Log table.
 * 
 * @param {String} action A string describing the error.
 * @param {String} pid The PID of the user that performed the action, or null if
 *                     the action is not associated with any one user. Defaults
 *                     to null.
 */
module.exports.error = (action, pid = null, err = null) => module.exports.log(`${action}${err ? ` ${typeof err === 'object' ? JSON.stringify(err, Object.getOwnPropertyNames(err)) : err}` : ''}`, 'error', pid);

/**
 * Returns all logs in the database
 */
module.exports.getAllLogs = () => {
    return new Promise((resolve, reject) => {
        DB.selectAll(tableNames.log, null, []).then(({ result }) => {
            return resolve(result.map((res) => new Log(res)));
        }).catch((err) => reject(err));
    })
}

/**
 * Returns a list of all logs associated with the user of the given PID
 *
 * @param {String} pid The PID of the user as stored in the database's User
 *                     table
 */
module.exports.getLogsByUserPID = (pid) => {
    return new Promise((resolve, reject) => {
        DB.selectWhere(tableNames.log, null, [], { pid }, [])
            .then(({ result }) => {
                if (result === null) {
                    return resolve(null);
                } else {
                    return resolve(result.map((res) => new Log(res)));
                }
            }).catch((err) => reject(err))
    })
}
