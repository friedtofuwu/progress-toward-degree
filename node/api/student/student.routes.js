module.exports = (app) => {
    const studentController = require("./student.controller.js");
    const { isAuthenticated } = require("../auth/auth.status.js");

    // Get All Students
    app.get("/api/students", isAuthenticated, studentController.findAll);

    app.get("/api/students/advisor", isAuthenticated, studentController.getAdvisor);

    //Get student with student ID
    app.get("/api/students/:studentID", isAuthenticated, studentController.findOne);

    //Get Student courses for student with student ID
    app.get("/api/students/:studentID/courses", isAuthenticated, studentController.findCourses);
};
