module.exports.isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    next();
  } else {
    res.status(401).json({ message: "Not Authenticated" });
  }
};

module.exports.isAdvisor = (req, res, next) => {
  if ((res.locals.currentUser.permissions & 1) == 1) {
    next();
  } else {
    res.status(403).json({ message: "Not an Advisor" });
  }
};

module.exports.isAdmin = (req, res, next) => {
  if ((res.locals.currentUser.permissions & 2) == 2) {
    next();
  } else {
    res.status(403).json({ message: "Not an Admin" });
  }
};

module.exports.isUnderGradmin = (req, res, next) => {
  if ((res.locals.currentUser.permissions & 4) == 4) {
    next();
  } else {
    res.status(403).json({message: "Not an UnderGradmin"});
  }
};

module.exports.isGradmin = (req, res, next) => {
  if ((res.locals.currentUser.permissions & 8) == 4) {
    next();
  } else {
    res.status(403).json({message: "Not a Gradmin"});
  }
};
