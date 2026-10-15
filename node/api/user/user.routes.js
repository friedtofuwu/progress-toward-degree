module.exports = (app) => {
  const userController = require("./user.controller.js");
  const { isAdmin, isAuthenticated } = require("../auth/auth.status.js");
  var bodyParser = require("body-parser");

  // create application/json parser
  var jsonParser = bodyParser.json();

  // Create a new User
  app.post("/api/user", isAuthenticated, isAdmin, jsonParser, userController.create);

  // Retrieve all Users
  app.get("/api/user/all", isAuthenticated, isAdmin, userController.findAll);

  // Retrieve a single user with pid
  app.get("/api/user/pid/:pid", isAuthenticated, isAdmin, userController.findOneByPid);

  // Update a User with pid
  app.patch("/api/user/:pid", isAuthenticated, isAdmin, jsonParser, userController.updatePermissions);

  // Delete a User with pid
  app.delete("/api/user/:pid", isAuthenticated, isAdmin, jsonParser, userController.delete);

  // Retrieve current User
  app.get("/api/currentUser", isAuthenticated, userController.currentUser);
};
