module.exports = (app) => {
    const logsController = require("./logs.controller.js");
    const { isAdmin, isAuthenticated } = require("../auth/auth.status.js");

    // Retrieve all Users
    app.get("/api/log/all", isAuthenticated, isAdmin, logsController.getAll);
    
    // Retrieve a single user with pid
    app.get("/api/log/pid/:pid", isAuthenticated, isAdmin, logsController.getOneByPID);
  };
  