const { DB, tableNames } = require('../handler')

class UG_Term {
    constructor({termcode, open, close}) {
        this.termcode = termcode;
        this.open = open;
        this.close = close;
    } toJSON() {
        return {
            termcode: this.termcode,
            open: this.open,
            close: this.close
        }
    }
}
module.exports.UG_Term = UG_Term;

const fullColSelection = ['termcode', 'open', 'close']
const fullColSelectionList = [0]

/**
 * Returns all UG terms in the database
 */
module.exports.getAllUG_Terms = () => {
    return new Promise((resolve, reject) => {
        DB.selectWhere(
            tableNames.ugTerm, fullColSelection, fullColSelectionList,
            [],[],"termcode",false
        ).then(({ result }) => {
            return resolve(result.map((res) => new UG_Term(res)));
        }).catch((err) => reject(err))
    })
}

/**
 * Returns all active UG terms in the database
 */
module.exports.getActiveUG_Terms = () => {
    return new Promise((resolve, reject) => {
        DB.query(`
        SELECT ${tableNames.ugTerm}.termcode, open, close
        FROM ${tableNames.ugTerm}
        INNER JOIN (
            SELECT termcode, COUNT(crn) AS openclasses FROM ${tableNames.ugTimetable} WHERE active = 1 GROUP BY termcode
        ) AS classes ON ${tableNames.ugTerm}.termcode = classes.termcode
        WHERE CURDATE() BETWEEN open AND close;
        `).then(({ result }) => resolve(result.map((res) => new UG_Term(res))))
        .catch((err) => reject(err));
    })
}

/**
 * 
 * @param {Int} termcode The termcode of the UG_Term to update
 * @param {String} open The date the form opens (YYYY-MM-DD)
 * @param {String} close The date the form closes (YYYY-MM-DD)
 */
module.exports.setUG_Dates = (termcode, open, close) => {
    return new Promise((resolve, reject) => {
        DB.update(tableNames.ugTerm, {open, close}, [], {termcode})
        .then((response) => resolve(response))
        .catch((err) => reject(err));
    })
}

/**
 * Deletes the UG term which cascades to remove all sections associated with it
 */
module.exports.dropUG_Term = (termcode) => {
    return new Promise((resolve, reject) => {
        DB.delete(tableNames.ugTerm, {termcode}, [])
        .then((response) => resolve(response))
        .catch((err) => reject(err));
    })
}