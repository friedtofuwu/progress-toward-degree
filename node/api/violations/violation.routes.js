// module.exports = (app) => {

//     const violationsController = require("./violation.controller.js");
//     const { isAuthenticated } = require("../auth/auth.status.js");
//     // Retrieve all Violations
//     app.get("/api/violations", isAuthenticated, violationsController.findAll);

//     // Retrieve a single Violation with violationId
//     app.get("/api/violations/:violationId", isAuthenticated, violationsController.findOne);

//     // Retrieve all Violations for a specific student
//     app.get("/api/students/:studentId/violations", isAuthenticated, violationsController.findByStudentId);
// };

// No-op route module. P91 endpoints removed.
module.exports = () => {};

