const passport = require("passport");
const casLogin = (req, res, next) => {
  passport.authenticate("cas", (err, user, info) => {
    if (err) {
      return res.redirect("/unauthorized");
    }

    if (!user) {
      req.session.messages = info.message;
      return res.redirect("/unauthorized");
    }

    req.logIn(user, (err) => {
      if (err) {
        return res.redirect("/unauthorized");
      }

      req.session.messages = "";
      return res.redirect("/");
    });
  })(req, res, next);
};

module.exports = casLogin;
