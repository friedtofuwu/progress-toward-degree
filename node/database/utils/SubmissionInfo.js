const { DB, tableNames } = require("../handler");

/**
 * Returns all past submission entries stored in the database
 */
module.exports.getFullSubmissionHistory = () => {
    return new Promise((resolve, reject) => {
        DB.selectAll(tableNames.submissionInfo, null, [], 'timestamp', false)
            .then(({ result }) => resolve(result))
            .catch((err) => reject(err));
    })
}

/**
 * Returns the most recent submission entry stored in the database, or null if
 * none were found
 */
module.exports.getLatestSubmissionInfo = () => {
    return new Promise((resolve, reject) => {
        DB.selectAll(tableNames.submissionInfo, null, [], 'timestamp', false, 1)
            .then(({ result }) => {
                if (result?.length === 1) {
                    return resolve(result[0]);
                } else if (result?.length === 0) {
                    return resolve(null);
                } else {
                    throw new Error(`Expected 1 row, got ${result?.length}`);
                }
            }).catch((err) => reject(err));
    })
}

/**
 * Returns all past submission entries stored in the database
 */
module.exports.logSubmission = (initiating_user_pid, filename, processing_time_ms, num_students, num_flagged_students) => {
    return new Promise((resolve, reject) => {
        DB.insert(
            tableNames.submissionInfo,
            { initiating_user_pid, filename, processing_time_ms, num_students, num_flagged_students }, []
        ).then(() => {
            return resolve();
        }).catch((err) => reject(err));
    })
}
