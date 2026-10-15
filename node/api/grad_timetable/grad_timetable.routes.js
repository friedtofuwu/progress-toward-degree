module.exports = (app) => {
    const timetableController = require("./grad_timetable.controller.js");
    const { isAdmin, isAuthenticated } = require("../auth/auth.status.js");
    var bodyParser = require("body-parser");

    //create application/json parser
    var jsonParser = bodyParser.json();

    //Get full timetable
    app.get("/api/grad/timetable", isAuthenticated, jsonParser, timetableController.getFullGrad_Timetable);

    //Get active sections in term
    app.get("/api/grad/timetable/activebyterm/:termcode", isAuthenticated, jsonParser, timetableController.getActiveGrad_TimetableByTermCode);

    //Get active classes by term
    app.get("/api/grad/classes/:termcode", isAuthenticated, jsonParser, timetableController.getGrad_Classes);

    //Get active sections within class by termcode
    app.get("/api/grad/classes/:termcode/:course_id", isAuthenticated, jsonParser, timetableController.getGrad_ClassSections);

    //Set class state
    app.post("/api/grad/classes/state", isAuthenticated, isAdmin, jsonParser, timetableController.setGrad_ClassState);

    //Set class ignore_enrollment
    app.post("/api/grad/classes/ignore", isAuthenticated, isAdmin, jsonParser, timetableController.setGrad_ClassIgnore);

    //Get sections in term
    app.get("/api/grad/timetable/term/:termcode", isAuthenticated, jsonParser, timetableController.getGrad_SectionsByTerm)

    //Update the timetable
    app.get("/api/grad/timetable/update", isAuthenticated, jsonParser, timetableController.updateTimeTable);
}