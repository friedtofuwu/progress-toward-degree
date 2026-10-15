const { DB, tableNames } = require('../handler')

class User {
    constructor({ pid, permissions, campus }) {
        this.pid = pid;
        this.permissions = permissions;
        this.campus = campus;
    } toJSON() {
        return {
            pid: this.pid,
            permissions: this.permissions,
            campus: this.campus
        }
    }
}
module.exports.User = User;

const fullColSelection = ['pid','permissions','campus']
const fullColSelectionList = [0]

/**
 * Returns all users in the database
 */
module.exports.getAllUsers = () => {
    return new Promise((resolve, reject) => {
        DB.selectAll(tableNames.user, fullColSelection, fullColSelectionList)
            .then(({ result }) => {
                return resolve(result.map((res) => new User(res)));
            }
            ).catch((err) => reject(err))
    })
}

/** Removed getUserByID b/c getting rid of ID */

/**
 * Returns the desired user if present in the database, or null otherwise
 * 
 * @param {String} pid The PID of the user as stored in the database's User
 *                     table
 */
module.exports.getUserByPID = (pid) => {
    return new Promise((resolve, reject) => {
        DB.selectOneWhere(
            tableNames.user, fullColSelection, fullColSelectionList, { pid }, []
        )
            .then(({ result }) => {
                if (result === null) {
                    return resolve(new User({pid, permissions:0, campus:0}));
                } else {
                    return resolve(new User(result));
                }
            }).catch((err) => reject(err))
    })
}

/**
 * Adds a user with the given PID, permissions, and campus to the database.
 * 
 * @param {String} pid The PID of the user to add
 * @param {String} permissions The permissions of the user:
 *      0 = Student (Default),
 *      1 = Advisor
 *      2 = P91 Admin
 *      4 = UnderGradmin
 *      8 = Gradmin
 * @param {Number} campus The campus of the user:
 *      0 = Blacksburg (Default),
 *      1 = National Capital Region, or
 *      2 = Both
 */
module.exports.addUser = (pid, permissions = 0, campus = 0) => {
    return new Promise((resolve, reject) => {
        DB.insert(tableNames.user, { pid, permissions, campus }, [])
            .then((response) => resolve(response))
            .catch((err) => reject(err))
    })
}

/**
 * Deletes the user with the given PID from the database.
 * 
 * @param {String} pid The PID of the user to delete
 */
module.exports.deleteUser = (pid) => {
    return new Promise((resolve, reject) => {
        DB.delete(tableNames.user, { pid }, [])
            .then((response) => resolve(response))
            .catch((err) => reject(err))
    });
}

/**
 * Updates the user with the given ID with the given permissions and campus.
 * 
 * @param {String} pid The PID of the user to update
 * @param {String} permissions The new permissions of the user, 0-15
 * @param {Number} campus The new campus of the user, 0-2
 */
module.exports.updateUser = (pid, permissions, campus) => {
    return new Promise((resolve, reject) => {
        DB.update(
            tableNames.user, { permissions, campus }, [], { pid }, []
        ).then((response) => resolve(response))
            .catch((err) => reject(err))
    });
}

/**
 * Updates the user of the given PID with the given permissions.
 * 
 * @param {String} pid The PID of the user to update
 * @param {String} permissions The new permissions of the user, 0-15
 */
module.exports.updateUserPermissions = (pid, permissions) => {
    return new Promise((resolve, reject) => {
        DB.update(
            tableNames.user, { permissions }, [], { pid }, []
        ).then((response) => resolve(response))
            .catch((err) => reject(err))
    });
}

/**
 * Updates the user of the given PID with the given permissions.
 * 
 * @param {String} pid The PID of the user to update
 * @param {Number} campus The new campus of the user, 0-2
 */
module.exports.updateUserCampus = (pid, campus) => {
    return new Promise((resolve, reject) => {
        DB.update(
            tableNames.user, { campus }, [], { pid }, []
        ).then((response) => resolve(response))
            .catch((err) => reject(err))
    });
}