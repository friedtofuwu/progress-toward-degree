const { DB, tableNames} = require('../handler');

class Grad_FAFiles{
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
module.exports.Grad_FAFiles = Grad_FAFiles;

const all_columns = ["fa_file_id","forceadd_id","file_name"]

/**
 * Adds record of a new file for a Grad_ForceAdd to the database
 * @param {Array} file_inputs Array of dictionaries of the form {forceadd_id, file_name}
 * @returns Grad_FAFiles DB identifier
 */
module.exports.addGradFAFiles = (file_inputs) => {
    return new Promise((resolve, reject) => {
        if(file_inputs.length == 0) {
            resolve(0);
        } else {
            DB.insertMany(
                tableNames.gradFAFiles,
                file_inputs
            ).then((resp) => {
                resolve(resp);
            }).catch((err) => {
                console.error(`[ERROR] Error inserting Grad_ForceAdd Files: `,err)
                reject(err);
            })
        }
    })
}

/**
 * Gets a list of all the PATHs of files associated with the given Grad_ForceAdd
 * @param {int} forceadd_id The ID of the Grad_ForceAdd associated with the file(s)
 * @returns Array of PATHs to the associated files
 */
module.exports.getGradFAFiles = (forceadd_id) => {
    return new Promise((resolve,reject) => {
        DB.selectWhere(
            tableNames.gradFAFiles,
            null, [],
            {forceadd_id}, []
        ).then((result) => {
            return resolve(result);
        }).catch((err)=> reject(err));
    })
}

/**
 * Gets a singular Grad_FAFile matching the provided fa_file_id
 * @param {int} fa_file_id DB identifier for a Grad_FAFile
 * @returns A singular Grad_FAFile
 */
module.exports.getGradFAFileWOwner = (fa_file_id) => {
    return new Promise((resolve, reject) => {
        DB.query(
            `SELECT fa_file_id,${tableNames.gradFAFiles}.forceadd_id,file_name,pid
            FROM ${tableNames.gradFAFiles} 
            INNER JOIN ${tableNames.gradForceAdd} ON ${tableNames.gradForceAdd}.forceadd_id = ${tableNames.gradFAFiles}.forceadd_id
            WHERE fa_file_id=?`,
            [fa_file_id]
        ).then((result) => {
            return resolve(result.result);
        }).catch((err) => reject(err));
    })
}

/**
 * Gets a singular Grad_FAFile matching the provided fa_file_id
 * @param {int} fa_file_id DB identifier for a Grad_FAFile
 * @returns A singular Grad_FAFile
 */
module.exports.getGradFAFile = (fa_file_id) => {
    return new Promise((resolve, reject) => {
        DB.selectOneWhere(
            tableNames.gradFAFiles,
            all_columns,[],
            {fa_file_id}, []
        ).then((result) => {
            return resolve(new Grad_FAFiles(result));
        }).catch((err) => {
            console.error(`[ERROR] Error getting Grad_FAFile ${fa_file_id}: `,err)
            reject(err)
        });
    })
}