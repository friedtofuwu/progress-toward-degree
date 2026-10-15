module.exports = (app) => {
    const termController = require("./ug_term.controller.js");
    const { isAdmin, isAuthenticated } = require("../auth/auth.status.js");
    var bodyParser = require("body-parser");

    // create application/json parser
    var jsonParser = bodyParser.json();

    // Get all terms
    app.get("/api/ug/term", isAuthenticated, termController.getUG_All);
    // Set dates for term
    app.post("/api/ug/term/dates", isAuthenticated, isAdmin, jsonParser, termController.setUG_Dates);
    // Get active terms
    app.get("/api/ug/term/active", isAuthenticated,termController.getUG_Active);
    // Drop given term
    app.post("/api/ug/term/drop", isAuthenticated, isAdmin, jsonParser, termController.dropUG_Term);
}