const { DB, tableNames} = require('../handler');

class FAFiles{
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
module.exports.FAFiles = FAFiles;

const all_columns = ["fa_file_id","forceadd_id","file_name"]

/**
 * Adds record of a new file for a ForceAdd to the database
 * @param {Array} file_inputs Array of dictionaries of the form {forceadd_id, file_name}
 * @returns FAFiles DB identifier
 */
module.exports.addFAFiles = (file_inputs) => {
    return new Promise((resolve, reject) => {
        if(file_inputs.length == 0) {
            resolve(0);
        } else {
            DB.insertMany(
                tableNames.faFiles,
                file_inputs
            ).then((resp) => {
                resolve(resp);
            }).catch((err) => {
                console.error(`[ERROR] Error inserting ForceAdd Files: `,err)
                reject(err);
            })
        }
    })
}

/**
 * Gets a list of all the PATHs of files associated with the given ForceAdd
 * @param {int} forceadd_id The ID of the ForceAdd associated with the file(s)
 * @returns Array of PATHs to the associated files
 */
module.exports.getFAFiles = (forceadd_id) => {
    return new Promise((resolve,reject) => {
        DB.selectWhere(
            tableNames.faFiles,
            null, [],
            {forceadd_id}, []
        ).then((result) => {
            return resolve(result);
        }).catch((err)=> reject(err));
    })
}

/**
 * Gets a singular FAFile matching the provided fa_file_id
 * @param {int} fa_file_id DB identifier for a FAFile
 * @returns A singular FAFile
 */
module.exports.getFAFileWOwner = (fa_file_id) => {
    return new Promise((resolve, reject) => {
        DB.query(
            `SELECT fa_file_id,${tableNames.faFiles}.forceadd_id,file_name,pid
            FROM ${tableNames.faFiles} 
            INNER JOIN ${tableNames.forceAdd} ON ${tableNames.forceAdd}.forceadd_id = ${tableNames.faFiles}.forceadd_id
            WHERE fa_file_id=?`,
            [fa_file_id]
        ).then((result) => {
            return resolve(result.result);
        }).catch((err) => reject(err));
    })
}

/**
 * Gets a singular FAFile matching the provided fa_file_id
 * @param {int} fa_file_id DB identifier for a FAFile
 * @returns A singular FAFile
 */
module.exports.getFAFile = (fa_file_id) => {
    return new Promise((resolve, reject) => {
        DB.selectOneWhere(
            tableNames.faFiles,
            all_columns,[],
            {fa_file_id}, []
        ).then((result) => {
            return resolve(new FAFiles(result));
        }).catch((err) => {
            console.error(`[ERROR] Error getting FAFile ${fa_file_id}: `,err)
            reject(err)
        });
    })
}