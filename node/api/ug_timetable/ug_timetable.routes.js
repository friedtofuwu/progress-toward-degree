module.exports = (app) => {
    const timetableController = require("./ug_timetable.controller.js");
    const { isAdmin, isAuthenticated } = require("../auth/auth.status.js");
    var bodyParser = require("body-parser");

    //create application/json parser
    var jsonParser = bodyParser.json();

    //Get full timetable
    app.get("/api/ug/timetable", isAuthenticated, jsonParser, timetableController.getFullUG_Timetable);

    //Get active sections in term
    app.get("/api/ug/timetable/activebyterm/:termcode", isAuthenticated, jsonParser, timetableController.getActiveUG_TimetableByTermCode);

    //Get active classes by term
    app.get("/api/ug/classes/:termcode", isAuthenticated, jsonParser, timetableController.getUG_Classes);

    //Get active sections within class by termcode
    app.get("/api/ug/classes/:termcode/:course_id", isAuthenticated, jsonParser, timetableController.getUG_ClassSections);

    //Set class state
    app.post("/api/ug/classes/state", isAuthenticated, isAdmin, jsonParser, timetableController.setUG_ClassState);

    //Set class ignore_enrollment
    app.post("/api/ug/classes/ignore", isAuthenticated, isAdmin, jsonParser, timetableController.setUG_ClassIgnore);

    //Get sections in term
    app.get("/api/ug/timetable/term/:termcode", isAuthenticated, jsonParser, timetableController.getUG_SectionsByTerm)

    //Update the timetable
    app.get("/api/ug/timetable/update", isAuthenticated, jsonParser, timetableController.updateTimeTable);
}