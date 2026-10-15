const { DB, tableNames } = require('../handler')

class Term {
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

const fullColSelection = ['termcode', 'open', 'close']
const fullColSelectionList = [0]

/**
 * Returns all terms in the database
 */
module.exports.getAllTerms = () => {
    return new Promise((resolve, reject) => {
        DB.selectWhere(
            tableNames.term, fullColSelection, fullColSelectionList,
            [],[],"termcode",false
        ).then(({ result }) => {
            return resolve(result.map((res) => new Term(res)));
        }).catch((err) => reject(err))
    })
}

/**
 * Returns all active terms in the database
 */
module.exports.getActiveTerms = () => {
    return new Promise((resolve, reject) => {
        DB.query(`
        SELECT Term.termcode, open, close
        FROM ${tableNames.term}
        INNER JOIN (
            SELECT termcode, COUNT(crn) AS openclasses FROM Timetable WHERE active = 1 GROUP BY termcode
        ) AS classes ON Term.termcode = classes.termcode
        WHERE CURDATE() BETWEEN open AND close;
        `).then(({ result }) => resolve(result.map((res) => new Term(res))))
        .catch((err) => reject(err));
    })
}

/**
 * 
 * @param {Int} termcode The termcode of the Term to update
 * @param {String} open The date the form opens (YYYY-MM-DD)
 * @param {String} close The date the form closes (YYYY-MM-DD)
 */
module.exports.setDates = (termcode, open, close) => {
    return new Promise((resolve, reject) => {
        DB.update(tableNames.term, {open, close}, [], {termcode})
        .then((response) => resolve(response))
        .catch((err) => reject(err));
    })
}

/**
 * Deletes the term which cascades to remove all sections associated with it
 */
module.exports.dropTerm = (termcode) => {
    return new Promise((resolve, reject) => {
        DB.delete(tableNames.term, {termcode}, [])
        .then((response) => resolve(response))
        .catch((err) => reject(err));
    })
}