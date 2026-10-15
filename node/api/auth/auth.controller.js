// Retrieve and return all Users from the database.
exports.login = (req, res) => {
  res.json({ user: res.locals.currentUser?.toJSON() || null });
};

// Retrieve and return all Users from the database.
exports.logout = (req, res) => {
  req.session.destroy((err) => {
    res.redirect("https://login.vt.edu/profile/cas/logout");
  });
};
