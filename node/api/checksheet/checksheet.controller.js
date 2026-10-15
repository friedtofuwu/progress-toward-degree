const { DB } = require("../../database/handler");
const { splitCourseName } = require("../../database/utils/Course");
const Log = require("../../database/utils/Log");
const { getCurrentUser } = require("../helpers");
const Checksheet = require("../../database/utils/Checksheet");

const Joi = require("joi");

// GET /api/checksheet/:year/:category?
module.exports.getYear = async (req, res) => {
  const { year, category } = req.params;

  try {
    const { result, status } = await Checksheet.getYear(year, category);
    return res.status(status).send(result);
  } catch {
    return res.status(500);
  }
};

// GET /api/checksheet/years/
module.exports.getYearNumbers = async (_, res) => {
  try {
    const { result, status } = await Checksheet.getYearNumbers();
    return res.status(status).send(result);
  } catch {
    return res.status(500);
  }
};

// POST /api/checksheet/add/
module.exports.addCourse = async (req, res) => {
  const payload = req.body;

  const schema = Joi.object({
    year: Joi.number().required(),
    subject: Joi.string().required(),
    category: Joi.string().required(),
    course_number: Joi.string().required(),
    credit_hours: Joi.number().required(),
    repeatable: Joi.boolean().required(),
    passing_grade: Joi.string()
      .valid(
        "P",
        "A+",
        "A",
        "A-",
        "B+",
        "B",
        "B-",
        "C+",
        "C",
        "C-",
        "D+",
        "D",
        "D-",
        "F+",
        "F",
        "F-"
      )
      .optional(),
    conc_eligible: Joi.string().valid("DCC", "Secure", "cs").optional(),
    substitutes: Joi.array()
      .items(
        Joi.object({
          subject: Joi.string().required(),
          course_number: Joi.string().required(),
          credit_hours: Joi.number().required(),
        })
      )
      .optional(),
  });

  const { error, value } = schema.validate(payload);

  if (error) {
    res.status(400).send(error.details.map((detail) => detail.message));
  } else {
    //Substitutes have to be a string with the new database for some reason
    const fixedValue = {
      ...value,
      substitutes: JSON.stringify(value.substitutes),
    };
    const { result, status } = await Checksheet.addCourse(fixedValue);
    res.status(status).send({ message: result });
  }
};

// POST /api/checksheet/copy/:toYear/from/:fromYear
module.exports.copyYear = async (req, res) => {
  const { pastYear, newYear } = req.params;

  const validYear = Joi.object({
    pastYear: Joi.number().required(),
    newYear: Joi.number().required(),
  });

  const { error, value } = validYear.validate({ pastYear, newYear });

  if (error) {
    res.status(400).send(error.details.map((detail) => detail.message));
  } else {
    const { result, status } = await Checksheet.copyCourse(value);
    res.status(status).send({ message: result });
  }
};

// DELETE /api/checksheet/delete/:course
module.exports.deleteCourses = async (req, res) => {
  const payload = req.body;

  let schema = Joi.array().items(
    Joi.object({
      year: Joi.number().required(),
      subject: Joi.string().required(),
      category: Joi.string().optional(),
      course_number: Joi.string().required(),
      credit_hours: Joi.number().optional(),
      repeatable: Joi.boolean().optional(),
      passing_grade: Joi.string()
        .valid(
          "P",
          "A+",
          "A",
          "A-",
          "B+",
          "B",
          "B-",
          "C+",
          "C",
          "C-",
          "D+",
          "D",
          "D-",
          "F+",
          "F",
          "F-"
        )
        .optional(),
      conc_eligible: Joi.string().valid("dss", "cyber").optional(),
      substitutes: Joi.array()
        .items(
          Joi.object({
            subject: Joi.string().required(),
            course_number: Joi.string().required(),
            credit_hours: Joi.number().required(),
          })
        )
        .optional(),
    }).required()
  );

  const { error, value } = schema.validate(payload);

  if (error) {
    res.status(400).send(error.details.map((detail) => detail.message));
  } else {
    const { result, status } = await Checksheet.deleteCourses(value);
    res.status(status).send({ message: result });
  }
};

// GET /api/checksheet/categories/:year/:category
module.exports.getCategoryCoursesForFilter = async (req, res) => {
  const { year, category } = req.params;

  try {
    const { result, status } = await Checksheet.getCategoryCoursesForFilter(
      year,
      category
    );
    return res.status(status).send(result);
  } catch {
    return res.status(500);
  }
};
