const { DB, tableNames } = require('../handler')

class Grad_Term {
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
module.exports.Grad_Term = Grad_Term;

const fullColSelection = ['termcode', 'open', 'close']
const fullColSelectionList = [0]

/**
 * Returns all Grad terms in the database
 */
module.exports.getAllGrad_Terms = () => {
    return new Promise((resolve, reject) => {
        DB.selectWhere(
            tableNames.gradTerm, fullColSelection, fullColSelectionList,
            [],[],"termcode",false
        ).then(({ result }) => {
            return resolve(result.map((res) => new Grad_Term(res)));
        }).catch((err) => reject(err))
    })
}

/**
 * Returns all active Grad terms in the database
 */
module.exports.getActiveGrad_Terms = () => {
    return new Promise((resolve, reject) => {
        DB.query(`
        SELECT ${tableNames.gradTerm}.termcode, open, close
        FROM ${tableNames.gradTerm}
        INNER JOIN (
            SELECT termcode, COUNT(crn) AS openclasses FROM ${tableNames.gradTimetable} WHERE active = 1 GROUP BY termcode
        ) AS classes ON ${tableNames.gradTerm}.termcode = classes.termcode
        WHERE CURDATE() BETWEEN open AND close;
        `).then(({ result }) => resolve(result.map((res) => new Grad_Term(res))))
        .catch((err) => reject(err));
    })
}

/**
 * 
 * @param {Int} termcode The termcode of the Grad_Term to update
 * @param {String} open The date the form opens (YYYY-MM-DD)
 * @param {String} close The date the form closes (YYYY-MM-DD)
 */
module.exports.setGrad_Dates = (termcode, open, close) => {
    return new Promise((resolve, reject) => {
        DB.update(tableNames.gradTerm, {open, close}, [], {termcode})
        .then((response) => resolve(response))
        .catch((err) => reject(err));
    })
}

/**
 * Deletes the Grad term which cascades to remove all sections associated with it
 */
module.exports.dropGrad_Term = (termcode) => {
    return new Promise((resolve, reject) => {
        DB.delete(tableNames.gradTerm, {termcode}, [])
        .then((response) => resolve(response))
        .catch((err) => reject(err));
    })
}