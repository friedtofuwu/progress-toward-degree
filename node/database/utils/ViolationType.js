const { DB, tableNames } = require('../handler')

class ViolationType {
    constructor({ id, message, warning_message }) {
        this.id = id;
        this.message = message;
        this.warningMessage = warning_message;
    }
    toJSON() {
        return {
            id: this.id,
            message: this.message,
            warning_message: this.warningMessage
        }
    }
}
module.exports.ViolationType = ViolationType;

/**
 * Returns all violation types in the database
 */
module.exports.getAllViolationTypes = () => {
    return new Promise((resolve, reject) => {
        DB.selectAll(tableNames.violationType, null, []).then(({ result }) => {
            return resolve(result.map((res) => new ViolationType(res)));
        }).catch((err) => reject(err));
    })
}

/**
 * Returns the desired violation type if present in the database, or null
 * otherwise
 *
 * @param {String} id The ID of the violation type as stored in the database's
 *                    Violation_Type table
 */
module.exports.getViolationTypeByID = (id) => {
    return new Promise((resolve, reject) => {
        DB.selectOneWhere(tableNames.violationType, null, [], { id }, [])
            .then(({ result }) => {
                if (result === null) {
                    return resolve(null);
                } else {
                    return resolve(new ViolationType(result));
                }
            }).catch((err) => reject(err))
    })
}

module.exports.getViolationMessage = (id) => {
    return new Promise((resolve, reject) => {
        module.exports.getViolationTypeByID(id).then((result) => {
            if (result)
                resolve(result.message);
            else
                reject(new Error(`Violation type of id '${id}' not found`));
        }).catch((err) => reject(err));
    })
}

module.exports.getViolationWarningMessage = (id) => {
    return new Promise((resolve, reject) => {
        module.exports.getViolationTypeByID(id).then((result) => {
            if (result)
                resolve(result.warningMessage);
            else
                reject(new Error(`Violation type of id '${id}' not found`));
        }).catch((err) => reject(err));
    })
}
