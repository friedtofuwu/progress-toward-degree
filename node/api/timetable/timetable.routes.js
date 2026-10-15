module.exports = (app) => {
    const timetableController = require("./timetable.controller.js");
    const { isAdmin, isAuthenticated } = require("../auth/auth.status.js");
    var bodyParser = require("body-parser");

    //create application/json parser
    var jsonParser = bodyParser.json();

    //Get full timetable
    app.get("/api/timetable", isAuthenticated, jsonParser, timetableController.getFullTimetable);

    //Get active sections in term
    app.get("/api/timetable/activebyterm/:termcode", isAuthenticated, jsonParser, timetableController.getActiveTimetableByTermCode);

    //Get active classes by term
    app.get("/api/classes/:termcode", isAuthenticated, jsonParser, timetableController.getClasses);

    //Get active sections within class by termcode
    app.get("/api/classes/:termcode/:course_id", isAuthenticated, jsonParser, timetableController.getClassSections);

    //Set class state
    app.post("/api/classes/state", isAuthenticated, isAdmin, jsonParser, timetableController.setClassState);

    //Set class ignore_enrollment
    app.post("/api/classes/ignore", isAuthenticated, isAdmin, jsonParser, timetableController.setClassIgnore);

    //Get sections in term
    app.get("/api/timetable/term/:termcode", isAuthenticated, jsonParser, timetableController.getSectionsByTerm)

    //Update the timetable
    app.get("/api/timetable/update", isAuthenticated, jsonParser, timetableController.updateTimeTable);
}