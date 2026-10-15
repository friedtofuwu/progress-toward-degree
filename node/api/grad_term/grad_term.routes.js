module.exports = (app) => {
    const termController = require("./grad_term.controller.js");
    const { isAdmin, isAuthenticated } = require("../auth/auth.status.js");
    var bodyParser = require("body-parser");

    // create application/json parser
    var jsonParser = bodyParser.json();

    // Get all terms
    app.get("/api/grad/term", isAuthenticated, termController.getGrad_All);
    // Set dates for term
    app.post("/api/grad/term/dates", isAuthenticated, isAdmin, jsonParser, termController.setGrad_Dates);
    // Get active terms
    app.get("/api/grad/term/active", isAuthenticated,termController.getGrad_Active);
    // Drop given term
    app.post("/api/grad/term/drop", isAuthenticated, isAdmin, jsonParser, termController.dropGrad_Term);
}