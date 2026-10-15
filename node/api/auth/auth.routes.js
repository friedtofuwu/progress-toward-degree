module.exports = (app) => {
    const auth = require("./auth.controller.js");
    const casLogin = require("./auth.login.js");

    // Login to VT CAS
    app.get("/api/login", casLogin, auth.login);

    // Logout from VT CAS
    app.get("/api/logout", auth.logout);
};
