module.exports = (app) => {
    const termController = require("./term.controller.js");
    const { isAdmin, isAuthenticated } = require("../auth/auth.status.js");
    var bodyParser = require("body-parser");

    // create application/json parser
    var jsonParser = bodyParser.json();

    // Get all terms
    app.get("/api/term", isAuthenticated, termController.getAll);
    // Set dates for term
    app.post("/api/term/dates", isAuthenticated, isAdmin, jsonParser, termController.setDates);
    // Get active terms
    app.get("/api/term/active", isAuthenticated,termController.getActive);
    // Drop given term
    app.post("/api/term/drop", isAuthenticated, isAdmin, jsonParser, termController.dropTerm);
}