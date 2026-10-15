const mysql = require('mysql2')
const { getKV, arrayFrom, valsNotFrom, listToStr } = require('../helpers/objectManipulation')

module.exports.tableNames = {
    user: 'User',
    log: 'Log',
    submissionInfo: 'Submission_Info',
    student: 'Student',
    course: 'Course',
    violationType: 'Violation_Type',
    violation: 'Violation',
    violationCourse: 'Violation_Course',
    checksheet: 'Checksheet',
    additional: 'Additional_Student_Info',
    timetable: 'Timetable',
    newTimetable: 'NewTimetable',
    term: 'Term',
    forceAdd: 'ForceAdd',
    faFiles: 'FAFiles',
    ugTimetable: 'UG_Timetable',
    ugTerm: 'UG_Term',
    ugForceAdd: 'UG_ForceAdd',
    ugFAFiles: 'UG_FAFiles',
    gradTimetable: 'Grad_Timetable',
    gradTerm: 'Grad_Term',
    gradForceAdd: 'Grad_ForceAdd',
    gradFAFiles: 'Grad_FAFiles',
    auditInfo: 'Audit_Info',
    studentProgress: 'Student_Progress',
    additionalProgress: 'Additional_Student_Progress_Info',
    progressCourse: 'Progress_Course'
}

class DB {
    static #pool = null;
    static #unInitError = new Error("DB handler not initialized.");
    static processingLock = false;
    static auditLock = false;
    static submissionLock = false;

    /**
     * Initializes the MySQL connection. Other functions of this class will not
     * work until this function is called once.
     */
    static init(connectionAttempts = 10, waitMS = 5000) {
        return new Promise(async (resolve) => {
            if (this.#pool === null) {
                const host = `${process.env.MYSQL_HOST || 'mysql-db'}`
                const user = process.env.MYSQL_USER || 'db-user'
                this.#pool = mysql.createPool({
                    host: host,
                    user: user,
                    password: process.env.MYSQL_PASSWORD,
                    database: process.env.MYSQL_DATABASE || 'progress-db',
                    waitForConnections: true,
                    connectionLimit: 10,
                    enableKeepAlive: true,
                    keepAliveInitialDelay: 0
                });
                console.log(`[DB INIT] Created connection pool for ${user}@${host}.`);
            } else {
                console.error('[DB INIT] Connection pool already exists. Skipping creation.');
            }

            this.waitForDBConnection(connectionAttempts, waitMS)
                .then((couldConnect) => resolve(couldConnect));
        })
    }

    static end() {
        if (this.#pool !== null) {
            this.#pool.end((err) => {
                if (err) {
                    console.log(`[DB END] Error ending connection pool:`, err);
                } else {
                    console.log('[DB END] Ended connection pool.');
                }
            })
        } else {
            console.error('[DB END] No connection pool currently exists. Skipping closure.');
        }
    }

    static async waitForDBConnection(attempts = 10, waitMS = 5000) {
        return new Promise((resolve) => {
            if (attempts <= 0) {
                return resolve(false);
            }

            const remainingAttempts = attempts - 1
            this.#pool.getConnection(async (err, conn) => {
                if (err) {
                    console.log(`[DB INIT] Could not connect. ${attempts > 0 ? `Trying again in ${waitMS / 1000}s... (${remainingAttempts} attempts remaining)` : ''}`);
                    (new Promise(resolve => setTimeout(resolve, waitMS))).then(() => {
                        this.waitForDBConnection(remainingAttempts, waitMS)
                            .then((couldConnect) => resolve(couldConnect));
                    });
                } else {
                    conn.release();
                    console.log(`[DB INIT] Successfully connected to database!`);
                    return resolve(true);
                }
            });
        })
    }

    /**
     * Attempt to lock the database for processing
     * 
     * @returns True if the lock could be attained, or false if the database is
     *          already locked
     */
    static attemptLock() {
        if (this.processingLock) {
            return false
        } else {
            this.processingLock = true;
            return true;
        }
    }

    /**
     * Attempt to lock for audit processing
     * @returns True if the lock could be attained, false otherwise
     */
    static attemptAuditLock() {
        if (this.auditLock) {
            return false;
        } else {
            this.auditLock = true;
            return true;
        }
    }

    /**
     * Attempt to lock for submission processing
     * @returns True if the lock could be attained, false otherwise
     */
    static attemptSubmissionLock() {
        if (this.submissionLock) {
            return false;
        } else {
            this.submissionLock = true;
            return true;
        }
    }

    /**
     * Unlocks the database to allow future requests to process
     */
    static unlock() {
        this.processingLock = false;
    }

    /**
     * Unlocks the audit lock
     */
    static unlockAudit() {
        this.auditLock = false;
    }

    /**
     * Unlocks the submission lock
     */
    static unlockSubmission() {
        this.submissionLock = false;
    }

    /**
     * Returns whether the database is currently locked for processing
     * 
     * @returns True if the database is locked, or false otherwise
     */
    static isLocked() {
        return this.processingLock;
    }

    /**
     * Returns whether audit processing is locked
     * @returns True if audit is locked, false otherwise
     */
    static isAuditLocked() {
        return this.auditLock;
    }

    /**
     * Returns whether submission processing is locked
     * @returns True if submission is locked, false otherwise
     */
    static isSubmissionLocked() {
        return this.submissionLock;
    }

    /**
     * Query the database, preparing the given query with placeholders and
     * values to protect against SQL injection attacks.
     *
     * @param {String} queryStr The query to run against the MySQL database,
     *                          with '?'s used as placeholders for values and
     *                          '`'s surrounding table and column names.
     * @param {Array} values The values to safely place where the placeholder
     *                       '?' characters appear in the queryStr.
     */
    static query(queryStr, values = []) {
        return new Promise((resolve, reject) =>
            this.#pool.execute(
                queryStr, values, (err, result, fields) => {
                    if (err) reject(err)
                    else resolve({ result, fields })
                }
            )
        );
    }

    /**
     * Insert the given object into the given table. The object should have keys
     * as column names with their values being the associated values of the new
     * row.
     *
     * @param {String} tableName The table to insert the row into.
     * @param {Object} keyValueObj The values the row should have. All
     *                             unspecified values will be set to their
     *                             default values if applicable.
     * @param {Array} literals A list of string keys of keyValueObj that should
     *                         have their values interpreted literally (i.e.
     *                         when using functions like 'NOW()'). Defaults to
     *                         an empty list.
     */
    static insert(tableName, keyValueObj, literals = []) {
        return new Promise((resolve, reject) => {
            if (!this.#verifyConnection()) return reject(this.#unInitError);

            const keysStr = listToStr(Object.keys(keyValueObj), ', ', '`%s`');
            const placeholderStr = this.#objToPlaceholderStr(keyValueObj, literals, ', ', true);
            let q = `INSERT INTO \`${tableName}\` (${keysStr}) VALUES (${placeholderStr});`
            let v = valsNotFrom(keyValueObj, literals)
            this.query(q,v)
                .then((response) => resolve(response))
                .catch((err) => reject(err))
        })
    }

    /**
     * Insert the given objects into the given table. The object should have keys
     * as column names with their values being the associated values of the new
     * row.
     *
     * @param {String} tableName The table to insert the row into.
     * @param {Array} keyValueObjs Array of objects containing the values the
     *                         row should have. All unspecified values will
     *                         be set to their default values if applicable.
     * @param {Array} literals A list of string keys of keyValueObj that should
     *                         have their values interpreted literally (i.e.
     *                         when using functions like 'NOW()'). Defaults to
     *                         an empty list.
     */
    static insertMany(tableName, keyValueObjs, literals = []) {
        return new Promise((resolve, reject) => {
            if (!this.#verifyConnection()) return reject(this.#unInitError);
            //Only need the keys once so pull from first
            const keysStr = listToStr(Object.keys(keyValueObjs[0]), ', ', '`%s`');

            let placeholder = [];
            let vals = [];
            keyValueObjs.forEach((element) => {
                //Generate the placeholders needed for this row
                placeholder.push(this.#objToPlaceholderStr(element, literals, ', ', true));
                //Add the values needed for the placeholders
                vals = vals.concat(valsNotFrom(element, literals))
            })
            //Join all the placeholders
            const placeholderStr = placeholder.join("),(");
             
            this.query(
                `INSERT INTO \`${tableName}\` (${keysStr}) VALUES (${placeholderStr});`,
                vals
            )
                .then((response) => resolve(response))
                .catch((err) => reject(err))
        })
    }

    /**
     * Update the row matching the given primary key.
     *
     * @param {String} tableName The table to delete a row from
     * @param {Object} keyValueObj The values of the row that should be updated,
     *                             with keys being column names for the given
     *                             table and values being the new values for
     *                             their associated columns.
     * @param {Array} literals A list of string keys of keyValueObj that should
     *                         have their values interpreted literally (i.e.
     *                         when using functions like 'NOW()'). Defaults to
     *                         an empty list.
     * @param {Object} pKey An object representing all columns that make up the
     *                      primary key of the desired row.
     * @param {Array} pKeyLiterals A list of string keys of pKey that should
     *                             have their values interpreted literally (i.e.
     *                             when using functions like 'NOW()'). Defaults
     *                             to an empty list.
     */
    static update(tableName, keyValueObj, literals = [], pKey, pKeyLiterals = []) {
        return new Promise((resolve, reject) => {
            if (!this.#verifyConnection()) return reject(this.#unInitError);

            const valsPlaceholderStr = this.#objToPlaceholderStr(keyValueObj, literals);
            const primaryPlaceholderStr = this.#objToPlaceholderStr(pKey, pKeyLiterals, ' AND ');

            this.query(
                `UPDATE \`${tableName}\` SET ${valsPlaceholderStr} WHERE ${primaryPlaceholderStr};`,
                valsNotFrom(keyValueObj, literals).concat(valsNotFrom(pKey, pKeyLiterals))
            )
                .then((response) => resolve(response))
                .catch((err) => reject(err))
        })
    }

    /**
     * Delete the row matching the given primary key.
     * 
     * @param {String} tableName The table to delete a row from
     * @param {Object} pKey An object representing all columns that make up the
     *                      primary key of the desired row.
     * @param {Array} pKeyLiterals A list of string keys of pKey that should
     *                             have their values interpreted literally (i.e.
     *                             when using functions like 'NOW()'). Defaults
     *                             to an empty list.
     */
    static delete(tableName, pKey, pKeyLiterals = []) {
        return new Promise((resolve, reject) => {
            if (!this.#verifyConnection()) return reject(this.#unInitError);

            const placeholderStr = this.#objToPlaceholderStr(pKey, pKeyLiterals, ' AND ');

            this.query(
                `DELETE FROM \`${tableName}\` WHERE ${placeholderStr};`,
                valsNotFrom(pKey, pKeyLiterals)
            )
                .then((response) => resolve(response))
                .catch((err) => reject(err))
        })
    }

    /**
     * Get all rows from the given table
     *
     * @param {String} tableName The table to get rows from
     * @param {Array} cols The columns to return in the response. Will be null
     *                     by default, which returns all columns.
     * @param {Array} literalCols A list of indices of the cols list that should
     *                            be interpreted literally. Defaults to an empty
     *                            list.
     * @param {String} orderBy The column name to order the results by. If null,
     *                         no ordering will be specified. Defaults to null.
     * @param {Boolean} orderAsc Return the results in ascending order. If
     *                           false, returns the results in descending order.
     *                           Defaults to true.
     * @param {Number} limit Maximum number of rows to return. If 0, returns all
     *                       rows. Defaults to 0.
     * @param {Number} offset The number of rows to offset by in the result if a
     *                        non-zero limit was given. Defaults to 0.
     */
    static selectAll(
        tableName, cols = null, literalCols = [],
        orderBy = null, orderAsc = true, limit = 0, offset = 0
    ) {
        return this.selectWhere(
            tableName, cols, literalCols, {}, [], orderBy, orderAsc,
            limit, offset
        );
    }

    /**
     * Get all rows with column values exactly matching the fields in the given
     * object.
     *
     * @param {String} tableName The table to get rows from
     * @param {Array} cols The columns to return in the response. Will be null
     *                     by default, which returns all columns.
     * @param {Array} literalCols A list of indices of the cols list that should
     *                            be interpreted literally. Defaults to an empty
     *                            list.
     * @param {Object} match An object representing the values to test equality
     *                       of for each given column.
     * @param {Array} literals A list of string keys of match that should have
     *                         their values interpreted literally (i.e. when
     *                         using functions like 'NOW()'). Defaults to an
     *                         empty list.
     * @param {String} orderBy The column name to order the results by
     * @param {Boolean} orderAsc Return the results in ascending order. If
     *                           false, returns the results in descending order.
     * @param {Number} limit Maximum number of rows to return. If 0, returns all
     *                       rows. Defaults to 0.
     * @param {Number} offset The number of rows to offset by in the result if a
     *                        non-zero limit was given. Defaults to 0.
     */
    static selectWhere(
        tableName, cols = null, literalCols = [], match = {}, literals = [],
        orderBy = null, orderAsc = true, limit = 0, offset = 0
    ) {
        return new Promise((resolve, reject) => {
            if (!this.#verifyConnection()) return reject(this.#unInitError);
            const doFiltering = Object.keys(match).length > 0

            let colsStr = "*";
            if (cols !== null) {
                if (typeof cols === 'string')
                    colsStr = cols;
                else
                    colsStr = cols.map(
                        (col, i) => literalCols.includes(i) ? col : `\`${col}\``
                    ).join(', ');
            }

            let placeholderStr = ""
            if (doFiltering) placeholderStr = this.#objToPlaceholderStr(match, literals, ' AND ');

            let q = `SELECT ${colsStr} FROM \`${tableName}\``
            + `${doFiltering ? ` WHERE ${placeholderStr}` : ''}`
            + `${orderBy === null ? '' : ` ORDER BY \`${orderBy}\` ${orderAsc ? 'ASC' : 'DESC'}`}`
            + `${limit > 0 ? ` LIMIT ${limit} OFFSET ${offset}` : ''};`;
            let v = valsNotFrom(match, literals);
            this.query(
                q,
                v
            )
                .then((response) => resolve(response))
                .catch((err) => reject(err))
        })
    }

    /**
     * Get one row with column values exactly matching the fields in the given
     * object. If one row was found, it will be returned as the result. If none
     * were found, the null will be returned as the result. If more than one
     * were found, null will be returned as a result and a new error will be put
     * in err.
     *
     * @param {String} tableName The table to get rows from
     * @param {Array} cols The columns to return in the response. Will be null
     *                     by default, which returns all columns.
     * @param {Array} literalCols A list of indices of the cols list that should
     *                            be interpreted literally. Defaults to an empty
     *                            list.
     * @param {Object} match An object representing the values to test equality
     *                       of for each given column.
     * @param {Array} literals A list of string keys of match that should have
     *                         their values interpreted literally (i.e. when
     *                         using functions like 'NOW()'). Defaults to an
     *                         empty list.
     * @param {String} orderBy The column name to order the results by
     * @param {Boolean} orderAsc Return the results in ascending order. If
     *                           false, returns the results in descending order.
     * @param {Number} limit Maximum number of rows to return. If 0, returns all
     *                       rows. Defaults to 0.
     * @param {Number} offset The number of rows to offset by in the result if a
     *                        non-zero limit was given. Defaults to 0.
     */
    static selectOneWhere(
        tableName, cols = null, literalCols = [], match = {}, literals = [],
        orderBy = null, orderAsc = true, limit = 0, offset = 0
    ) {
        return new Promise((resolve, reject) => {
            this.selectWhere(
                tableName, cols, literalCols, match, literals,
                orderBy, orderAsc, limit, offset
            ).then(({ result, fields }) => {
                if (result.length === 0)
                    return resolve({ result: null, fields });
                else if (result.length === 1)
                    return resolve({ result: result[0], fields });
                else
                    return reject(new Error(`Expected 1 row, got ${result.length}`));
            }).catch((err) => reject(err))
        })
    }

    /**
     * Get all rows with column values matching the values in the given object.
     * Pattern matching uses standard MySQL wildcard syntax.
     *
     * @param {String} tableName The table to get rows from
     * @param {Array} cols The columns to return in the response. Will be null
     *                     by default, which returns all columns.
     * @param {Array} literalCols A list of indices of the cols list that should
     *                            be interpreted literally. Defaults to an empty
     *                            list.
     * @param {Object} match An object representing the values to pattern-match
     *                       for each given column.
     * @param {String} orderBy The column name to order the results by
     * @param {Boolean} orderAsc Return the results in ascending order. If
     *                           false, returns the results in descending order.
     * @param {Number} limit Maximum number of rows to return. If 0, returns all
     *                       rows. Defaults to 0.
     * @param {Number} offset The number of rows to offset by in the result if a
     *                        non-zero limit was given. Defaults to 0.
     */
    static selectLike(
        tableName, cols = null, literalCols = [], match = {},
        orderBy = null, orderAsc = true, limit = 0, offset = 0
    ) {
        return new Promise((resolve, reject) => {
            if (!this.#verifyConnection()) return reject(this.#unInitError);
            const doFiltering = Object.keys(match).length > 0

            const [keys, vals] = getKV(match);

            let colsStr = "*";
            if (cols !== null) {
                if (typeof cols === 'string') {
                    colsStr = cols;
                } else {
                    colsStr = cols.map(
                        (col, i) => literalCols.includes(i) ? col : `\`${col}\``
                    ).join(', ');
                }
            }

            let placeholderStr = ""
            if (doFiltering) placeholderStr = listToStr(keys, ' AND ', '`%s` LIKE ?');

            this.query(
                `SELECT ${colsStr} FROM \`${tableName}\``
                + `${doFiltering ? ` WHERE ${placeholderStr}` : ''}`
                + `${orderBy === null ? '' : ` ORDER BY \`${orderBy}\` ${orderAsc ? 'ASC' : 'DESC'}`}`
                + `${limit > 0 ? ` LIMIT ${limit} OFFSET ${offset}` : ''};`,
                vals
            )
                .then((response) => resolve(response))
                .catch((err) => reject(err))
        })
    }

    /**
     * Get all rows with column values matching the values in the given object.
     * Pattern matching uses standard MySQL wildcard syntax.
     *
     * @param {String} tableName The table to get rows from
     * @param {Array} cols The columns to return in the response. Will be null
     *                     by default, which returns all columns.
     * @param {Array} literalCols A list of indices of the cols list that should
     *                            be interpreted literally. Defaults to an empty
     *                            list.
     * @param {Object} match An object representing the values to pattern-match
     *                       for each given column.
     * @param {String} orderBy The column name to order the results by
     * @param {Boolean} orderAsc Return the results in ascending order. If
     *                           false, returns the results in descending order.
     * @param {Number} limit Maximum number of rows to return. If 0, returns all
     *                       rows. Defaults to 0.
     * @param {Number} offset The number of rows to offset by in the result if a
     *                        non-zero limit was given. Defaults to 0.
     */
    static selectOneLike(
        tableName, cols = null, literalCols = [], match = {},
        orderBy = null, orderAsc = true, limit = 0, offset = 0
    ) {
        return new Promise((resolve, reject) => {
            this.selectLike(
                tableName, cols, literalCols, match, orderBy, orderAsc,
                limit, offset
            ).then(({ result, fields }) => {
                if (result.length === 0)
                    return resolve({ result: null, fields });
                else if (result.length === 1)
                    return resolve({ result: result[0], fields });
                else
                    return reject(new Error(`Expected 1 row, got ${result.length}`));
            }).catch((err) => reject(err))
        })
    }

    /**
     * Get one row with column values matching the fields in the given object.
     * Pattern matching uses standard MySQL wildcard syntax. If one row was
     * found, it will be returned as the result. If none were found, the null
     * will be returned as the result. If more than one were found, null will be
     * returned as a result and a new error will be put in err.
     *
     * @param {String} tableName The table to get rows from
     * @param {Array} cols The columns to return in the response. Will return
     *                     all by default.
     * @param {Object} match A string representing the pattern any columns in
     *                       matching rows should match. Defaults to matching
     *                       everything.
     * @param {String} orderBy The column name to order the results by
     * @param {Boolean} orderAsc Return the results in ascending order. If
     *                           false, returns the results in descending order.
     * @param {Number} limit Maximum number of rows to return. If 0, returns all
     *                       rows. Defaults to 0.
     * @param {Number} offset The number of rows to offset by in the result if a
     *                        non-zero limit was given. Defaults to 0.
     */
    static selectAnyLike(
        tableName, cols = null, match = '%',
        orderBy = null, orderAsc = true, limit = 0, offset = 0
    ) {
        return new Promise((resolve, reject) => {
            if (!this.#verifyConnection()) return reject(this.#unInitError);

            // Get all column names
            this.queryColumnNames(tableName)
                .then(({ result: colNames, fields }) => {
                    if (colNames?.length > 0) {
                        let colsStr = "*";
                        if (cols !== null) colsStr = `(${listToStr(cols, ', ', '`%s`')})`;
                        const placeholderStr = listToStr(colNames, ' OR ', '`%s` LIKE ?');

                        this.query(
                            `SELECT ${colsStr} FROM \`${tableName}\``
                            + ` WHERE ${placeholderStr}`
                            + `${orderBy === null ? '' : ` ORDER BY \`${orderBy}\` ${orderAsc ? 'ASC' : 'DESC'}`}`
                            + `${limit > 0 ? ` LIMIT ${limit} OFFSET ${offset}` : ''};`,
                            arrayFrom(match, colNames.length)
                        )
                            .then((response) => resolve(response))
                            .catch((err) => reject(err))
                    } else {
                        // No columns to match
                        return resolve({ result: [], fields });
                    }
                })
                .catch((err) => reject(err))
        })
    }

    /**
     * 
     * @param {String} func The db procedure/function to run  
     */
    static executeFunction(func) {
        return new Promise((resolve, reject) => {
            if (!this.#verifyConnection()) return reject(this.#unInitError);

            this.query(`CALL ${func}();`)
            .then((response) => resolve(response))
            .catch((err) => reject(err))
        })
    }

    /**
     * Queries the database for the column names of the given table.
     * 
     * @param {String} tableName The table to get the column names from
     */
    static queryColumnNames(tableName) {
        return new Promise((resolve, reject) => {
            this.query(
                'SELECT `COLUMN_NAME` FROM `INFORMATION_SCHEMA`.`COLUMNS` WHERE `TABLE_NAME` = ?;',
                [tableName]
            ).then(({ result, fields }) => resolve({
                result: result.map(({ COLUMN_NAME: name }) => name), fields
            })).catch((err) => reject(err))
        })
    }

    /**
     * Queries the table for all distinct values that exist in the given column.
     * 
     * @param {String} tableName The table to get the column names from
     * @param {String} columnName The column to get distinct values from
     * @param {Boolean} sort If true, will sort the output. Defaults to false.
     * @param {Boolean} sortAsc If true, will sort in ascending order, or if
     *                         false, will sort in descending order. Defaults to
     *                         true.
     */
    static queryDistinctColumnValues(tableName, columnName, sort = false, sortAsc = true) {
        return new Promise((resolve, reject) => {
            this.query(
                `SELECT DISTINCT \`${columnName}\` FROM \`${tableName}\``
                + `${sort ? ` ORDER BY \`${columnName}\` ${sortAsc ? 'ASC' : 'DESC'}` : ''};`
            ).then(({ result, fields }) => resolve({
                result: result.map(({ [columnName]: val }) => val), fields
            })).catch((err) => reject(err))
        })
    }

    /**
     * Returns the number of rows in the given table. Resolves with 0 if the
     * count could not be read from the result.
     * 
     * @param {String} tableName The table to get the row count from
     */
    static countTableRows(tableName) {
        return new Promise((resolve, reject) => {
            this.query(`SELECT COUNT(*) AS \`count\` FROM \`${tableName}\`;`)
                .then(({ result, fields }) => resolve({
                    result: result[0]?.count || 0, fields
                }))
                .catch((err) => reject(err))
        })
    }

    /**
     * Removes all rows from the given table.
     * 
     * @param {String} tableName The table to delete all rows from
     */
    static clearTable(tableName) {
        return new Promise((resolve, reject) => {
            this.query(`DELETE FROM \`${tableName}\`;`)
                .then((response) => resolve(response))
                .catch((err) => reject(err))
        })
    }

    // Helper functions

    /**
     * Returns true if the pool is ready to accept connections
     */
    static #verifyConnection() {
        return this.#pool !== null;
    }

    /**
     * Creates a placeholder string based on the given key/value set and a list
     * of keys whose values are literal
     */
    static #objToPlaceholderStr(keyValueObj, literals = [], separator = ", ", valsOnly = false) {
        const res = Object.keys(keyValueObj).map((key) => {
            if (valsOnly)
                return literals.includes(key) ? keyValueObj[key] : '?'
            else
                return `\`${key}\` = ${literals.includes(key) ? keyValueObj[key] : '?'}`
        });

        return res.join(separator);
    }
};
module.exports.DB = DB;
