const Log = require("../../database/utils/Log");
const { getAllUsers, getUserByPID, addUser, deleteUser, updateUser, updateUserPermissions, updateUserCampus } = require("../../database/utils/User");
const { getCurrentUser } = require("../helpers");

// Create and Save a User
module.exports.create = (req, res) => {
    Log.info(`Received request to create user with req: '${JSON.stringify(req.body)}'.`, getCurrentUser(res)?.pid);
    // Validate request
    if (!req.body) {
        Log.warn(`Error creating user: request body is empty.`, getCurrentUser(res)?.pid);
        return res.status(400).send({
            message: "User content can not be empty",
        });
    } else if (!req.body.pid) {
        Log.warn (`Error creating user: request body does not contain a pid.`, getCurrentUser(res)?.pid);
        return res.status(400).send({
            message: "Must supply a PID",
        });
    }

    // Save user to the database
    const pid = req.body.pid;
    const permissions = req.body.permissions || 0;
    const campus = req.body.campus || 0;

    addUser(pid, permissions, campus).then(() => {
        Log.info(`Created user '${pid}' with permissions '${permissions}' and campus '${campus}'.`, getCurrentUser(res)?.pid);
        Log.info(`Account Created by ${getCurrentUser(res)?.pid} with permissions: ${permissions}`, pid)
        res.sendStatus(204);
    }).catch((err) => {
        Log.error(`Error creating user '${pid}' with permissions '${permissions}' and campus '${campus}': ${JSON.stringify(err)}`, getCurrentUser(res)?.pid);
        if (err.code.includes("DUP_")) {
            res.status(400).send({
                message: "User of that PID already exists",
            });
        } else {
            res.status(500).send({
                message: "Some error occurred while creating the User.",
            });
        }
    })
};

// Retrieve and return all Users from the database.
module.exports.findAll = (req, res) => {
    Log.info(`Received request to get all users.`, getCurrentUser(res)?.pid);
    getAllUsers().then((result) => {
        Log.info(`Successfully got all users.`, getCurrentUser(res)?.pid);
        res.status(200).json({
            users: result.map((user) => user.toJSON())
        });
    }).catch((err) => {
        Log.error(`Error getting all users: ${JSON.stringify(err)}`, getCurrentUser(res)?.pid);
        res.status(500).send({
            message: "Some error occurred while getting all users.",
        });
    })
};

/* findOne removed b/c getting rid of ID */

// Retrieve current User
module.exports.currentUser = (req, res) => {
    res.status(200).json({ user: getCurrentUser(res)?.toJSON() || null });
};

// Find a single user with a pid
module.exports.findOneByPid = (req, res) => {
    Log.info(`Received request to get single user of PID ${req.params.pid}.`, getCurrentUser(res)?.pid);
    getUserByPID(req.params.pid).then((result) => {
        if (result === null) {
            Log.info(`User of PID ${req.params.pid} not found.`, getCurrentUser(res)?.pid);
            res.status(404).send({
                message: "User not found."
            });
        } else {
            Log.info(`Successfully got single user of PID ${req.params.pid}: ${result}.`, getCurrentUser(res)?.pid);
            res.status(200).send({
                user: result
            });
        }
    }).catch((err) => {
        Log.error(`Error getting single user of PID ${req.params.pid}: ${JSON.stringify(err)}`, getCurrentUser(res)?.pid);
        res.status(500).send({
            message: "Some error occurred while getting the user.",
        });
    })
};

// Delete a user with the specified PID in the request
module.exports.delete = (req, res) => {
    Log.info(`Received request to delete user of PID ${req.params.pid}.`, getCurrentUser(res)?.pid);
    // Validate Request
    if (!req.params.pid) {
        Log.warn(`Error deleting user: request body does not contain a PID.`, getCurrentUser(res)?.pid);
        return res.status(400).send({
            message: "Must supply a PID",
        });
    } else if (req.params.pid === getCurrentUser(res)?.pid) {
        return res.status(400).send({
            message: "Cannot delete your own account.",
        });
    }
    getUserByPID(req.params.pid).then((result) => {
        if (result === null) {
            Log.info(`User of PID ${req.params.pid} not found to delete.`, getCurrentUser(res)?.pid);
            res.status(404).send({
                message: "User not found."
            });
        }
        else{
            const pid = result.pid;
            Log.info(`Successfully got single user to be deleted of PID ${result.pid}.`, getCurrentUser(res)?.pid);
            deleteUser(req.params.pid).then(() => {
                Log.info(`Successfully deleted user of PID: ${pid}.`, getCurrentUser(res)?.pid);
                Log.info(`Account(${req.params.pid}) deleted by ${getCurrentUser(res)?.pid}`, pid)
                res.sendStatus(204);
            }).catch((err) => {
                Log.error(`Error deleting user of PID ${req.params.pid}: ${JSON.stringify(err)}`, getCurrentUser(res)?.pid);
                res.status(500).send({
                    message: "Some error occurred while deleting the user.",
                });
            })
        }
    }).catch((err) => {
        Log.error(`Error fetching PID when deleting user of PID ${req.params.pid}: ${JSON.stringify(err)}`, getCurrentUser(res)?.pid);
        res.status(500).send({
            message: "Some error occurred while deleting the user.",
        });
    });
};

// Update the permissions of a user identified by the PID in the request
module.exports.updatePermissions = (req, res) => {
    Log.info(`Received request to update user of PID ${req.params.pid} with body: ${JSON.stringify(req.body)}.`, getCurrentUser(res)?.pid);
    // Validate Request
    if (!req.body) {
        Log.warn(`Error updating user of PID ${req.params.pid}: request body is empty.`, getCurrentUser(res)?.pid);
        return res.status(400).send({
            message: "User content can not be empty",
        });
    } else if (!req.body.pid) {
        Log.warn(`Error updating user: request body does not contain a pid.`, getCurrentUser(res)?.pid);
        return res.status(400).send({
            message: "Must supply a pid",
        });
    } else if (!req.body.permissions) {
        Log.warn(`Error updating user: request body does not contain permissions.`, getCurrentUser(res)?.pid);
        return res.status(400).send({
            message: "Must supply permissions",
        });
    } else if (req.params.pid === getCurrentUser(res)?.pid) {
        return res.status(400).send({
            message: "Cannot update your own permissions.",
        });
    }
    
    updateUserPermissions(req.params.pid, req.body.permissions).then(() => {
        Log.info(`Updated user of PID ${req.params.pid} to permissions '${req.body.permissions}'.`, getCurrentUser(res)?.pid);
        Log.info(`Account(${req.params.pid}) Updated by ${getCurrentUser(res)?.pid} to permissions: ${req.body.permissions}`, req.body.pid)
        res.sendStatus(204);
    }).catch((err) => {
        Log.error(`Error updating user of PID ${req.params.pid}: ${JSON.stringify(err)}`, getCurrentUser(res)?.pid);
        res.status(500).send({
            message: "Some error occurred while updating the user's permissions.",
        });
    })
};

// Update the campus of a user identified by the PID in the request
module.exports.updateCampus = (req, res) => {
    Log.info(`Received request to update user of PID ${req.params.pid} with body: ${JSON.stringify(req.body)}.`, getCurrentUser(res)?.pid);
    // Validate Request
    if (!req.body) {
        Log.warn(`Error updating user of PID ${req.params.pid}: request body is empty.`, getCurrentUser(res)?.pid);
        return res.status(400).send({
            message: "User content can not be empty",
        });
    } else if (!req.body.pid) {
        Log.warn(`Error updating user: request body does not contain a pid.`, getCurrentUser(res)?.pid);
        return res.status(400).send({
            message: "Must supply a pid",
        });
    } else if (!req.body.campus) {
        Log.warn(`Error updating user: request body does not contain a campus.`, getCurrentUser(res)?.pid);
        return res.status(400).send({
            message: "Must supply campus",
        });
    } else if (req.params.pid === getCurrentUser(res)?.pid) {
        return res.status(400).send({
            message: "Cannot update your own campus.",
        });
    }
    
    updateUserPermissions(req.params.pid, req.body.permissions).then(() => {
        Log.info(`Updated user of PID ${req.params.pid} to campus '${req.body.campus}'.`, getCurrentUser(res)?.pid);
        Log.info(`Account(${req.params.pid}) Updated by ${getCurrentUser(res)?.pid} to campus: ${req.body.campus}`, req.body.pid)
        res.sendStatus(204);
    }).catch((err) => {
        Log.error(`Error updating user of PID ${req.params.pid}: ${JSON.stringify(err)}`, getCurrentUser(res)?.pid);
        res.status(500).send({
            message: "Some error occurred while updating the user's campus.",
        });
    })
};