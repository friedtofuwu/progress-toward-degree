module.exports = (app) => {
  const checksheetController = require("./checksheet.controller.js");
  const { isAuthenticated } = require("../auth/auth.status.js");

  const bodyParser = require("body-parser");
  const jsonParser = bodyParser.json();

  // Get courses in a year, optionally specifying category
  app.get(
    "/api/checksheet/get/year/:year/:category?",
    isAuthenticated,
    checksheetController.getYear
  );

  // Get list of years in the database
  app.get(
    "/api/checksheet/get/numbers",
    isAuthenticated,
    checksheetController.getYearNumbers
  );

  // Get category courses for filtering (returns just course identifiers)
  app.get(
    "/api/checksheet/categories/:year/:category",
    isAuthenticated,
    checksheetController.getCategoryCoursesForFilter
  );

  // Create a new required course
  app.post(
    "/api/checksheet/add/",
    isAuthenticated,
    jsonParser,
    checksheetController.addCourse
  );

  // Create a new required course year based on an existing year
  app.post(
    "/api/checksheet/copy/:pastYear/to/:newYear",
    isAuthenticated,
    checksheetController.copyYear
  );

  // Delete a special course
  app.delete(
    "/api/checksheet/delete/",
    isAuthenticated,
    jsonParser,
    checksheetController.deleteCourses
  );
};
