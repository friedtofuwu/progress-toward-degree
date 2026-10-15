const { DB, tableNames} = require('../handler');

class UG_FAFiles{
    constructor({
        fa_file_id,
        forceadd_id,
        file_name
    }) {
        this.fa_file_id = fa_file_id;
        this.forceadd_id = forceadd_id;
        this.file_name = file_name;
    } toJSON() {
        return {
            fa_file_id: this.fa_file_id,
            forceadd_id: this.forceadd_id,
            file_name: this.file_name
        }
    }
}
module.exports.UG_FAFiles = UG_FAFiles;

const all_columns = ["fa_file_id","forceadd_id","file_name"]

/**
 * Adds record of a new file for a UG_ForceAdd to the database
 * @param {Array} file_inputs Array of dictionaries of the form {forceadd_id, file_name}
 * @returns UG_FAFiles DB identifier
 */
module.exports.addUGFAFiles = (file_inputs) => {
    return new Promise((resolve, reject) => {
        if(file_inputs.length == 0) {
            resolve(0);
        } else {
            DB.insertMany(
                tableNames.ugFAFiles,
                file_inputs
            ).then((resp) => {
                resolve(resp);
            }).catch((err) => {
                console.error(`[ERROR] Error inserting UG_ForceAdd Files: `,err)
                reject(err);
            })
        }
    })
}

/**
 * Gets a list of all the PATHs of files associated with the given UG_ForceAdd
 * @param {int} forceadd_id The ID of the UG_ForceAdd associated with the file(s)
 * @returns Array of PATHs to the associated files
 */
module.exports.getUGFAFiles = (forceadd_id) => {
    return new Promise((resolve,reject) => {
        DB.selectWhere(
            tableNames.ugFAFiles,
            null, [],
            {forceadd_id}, []
        ).then((result) => {
            return resolve(result);
        }).catch((err)=> reject(err));
    })
}

/**
 * Gets a singular UG_FAFile matching the provided fa_file_id
 * @param {int} fa_file_id DB identifier for a UG_FAFile
 * @returns A singular UG_FAFile
 */
module.exports.getUGFAFileWOwner = (fa_file_id) => {
    return new Promise((resolve, reject) => {
        DB.query(
            `SELECT fa_file_id,${tableNames.ugFAFiles}.forceadd_id,file_name,pid
            FROM ${tableNames.ugFAFiles} 
            INNER JOIN ${tableNames.ugForceAdd} ON ${tableNames.ugForceAdd}.forceadd_id = ${tableNames.ugFAFiles}.forceadd_id
            WHERE fa_file_id=?`,
            [fa_file_id]
        ).then((result) => {
            return resolve(result.result);
        }).catch((err) => reject(err));
    })
}

/**
 * Gets a singular UG_FAFile matching the provided fa_file_id
 * @param {int} fa_file_id DB identifier for a UG_FAFile
 * @returns A singular UG_FAFile
 */
module.exports.getUGFAFile = (fa_file_id) => {
    return new Promise((resolve, reject) => {
        DB.selectOneWhere(
            tableNames.ugFAFiles,
            all_columns,[],
            {fa_file_id}, []
        ).then((result) => {
            return resolve(new UG_FAFiles(result));
        }).catch((err) => {
            console.error(`[ERROR] Error getting UG_FAFile ${fa_file_id}: `,err)
            reject(err)
        });
    })
}