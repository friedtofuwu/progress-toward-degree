const {
  inMajorGradePoints,
  FLAG_THREE_REPEATS,
  FLAG_LOW_GPA,
  FLAG_FOUR_TOTAL_REPEATS,
  FLAG_MISSING_REQUIRED_COURSE,
  getAcademicYear,
} = require("./lookup");
const typedefs = require("../helpers/typedefs");
const _ = require("lodash");
const { getYear } = require("../database/utils/Checksheet");

/**
 * This determines a students readiness for graduation. It is built upon the previous groups work.
 * Processes student data and returns in a format that can be added to the database.
 *
 */

/**
 * @template {Object<string, typedefs.Student>} T
 * @param {T} courseInfo
 *
 * @template {Object<string, typedefs.AdditionalStudent>} K
 * @param {K} fullDataInfo
 *
 * @return {Promise<typedefs.ParserResult>} result - list of lists
 */
module.exports.analyzeStudents = async (courseInfo, fullDataInfo) => {
  const result = {
    flags: [],
    courses: [],
    students: [],
    additional: [],
  };

  try {
    for (let id in courseInfo) {
      const student = courseInfo[id];
      const { info, flags, courses } = await handlePolicyFlags(
        parseInt(id),
        student
      );
      result.courses = _.concat(result.courses, courses);
      result.flags = _.concat(result.flags, flags);
      result.students = _.concat(result.students, info);
    }

    for (let id in courseInfo) {
      const fieldInfo =
        id in fullDataInfo
          ? fullDataInfo[id]
          : { emailAddress: "N/A", completionTermCode: 0 };

      /** type {typedefs.StudentInfo} */
      const student = _.find(result.students, ["id", parseInt(id)]);

      if (student) {
        //Student may not exist in both files apparently?
        const courses = _.filter(result.courses, ["student_id", parseInt(id)]);

        const additional = await handleGradFlags(
          student.concentration,
          student.admit_term,
          courses,
          student.id,
          fieldInfo
        );
        result.additional = _.concat(result.additional, additional);
      }
    }
  } catch (err) {
    return Promise.reject(err);
  }

  return Promise.resolve(result);
};

/**
 * add graduation flags to student
 *
 * @param {string} concentration
 * @param {string} admitYear
 * @param {typedefs.CourseInfo} coursesTaken
 * @param {number} id
 * @param {typedefs.AdditionalStudent} student
 *
 * @returns additional student info, graduation flags, and missing courses not taken by student
 */
const handleGradFlags = async (
  concentration,
  admitTerm,
  coursesTaken,
  id,
  student
) => {
  try {
    /** @type {typedefs.AdditionalStudentInfo} */
    const result = {};

    result.id = id;
    result.email_address = student.emailAddress;
    result.completion_term_code = student.completionTermCode;

    const checksheet = await getYear(getAcademicYear(admitTerm));

    //Get map of checksheet courses to passing grade
    delete checksheet.result.year;
    const courseMap = {};
    Object.values(checksheet.result)
      .flat()
      .forEach((c) => {
        courseMap[c.subject + c.course_number] = c.passing_grade;
        c.substitutes.forEach((s) => {
          courseMap[s.subject + s.course_number] = "D-"; //Default passing grade
        });
      });
    //Restrict coursesTaken to only coursesPassed
    const possiblePassingGrades = [
      "P",
      "T",
      "A",
      "A-",
      "B+",
      "B",
      "B-",
      "C+",
      "CC",
      "C",
      "C-",
      "D+",
      "D",
      "D-",
    ];
    const coursesPassed = _.filter(coursesTaken, (course) => {
      //Find the courses passing grade
      let passingIndex = possiblePassingGrades.indexOf(
        courseMap[course.subj_expanded + course.course_number]
      );
      let gradeIndex = possiblePassingGrades.indexOf(course.grade);
      return !(gradeIndex == -1 || gradeIndex > passingIndex);
    });

    // Find missing courses
    let missingCourses = [];

    const core = verifyAll(coursesPassed, checksheet.result["core"]);
    const comm = verifyMinNumber(
      coursesPassed,
      checksheet.result["communications"],
      1,
      "communications"
    );
    const writing = verifyMinNumber(
      coursesPassed,
      checksheet.result["writing"],
      1,
      "writing"
    );
    //TODO: add data centric, pathways, and secure computing
    const data_centric = verifyMinNumber(
      coursesPassed,
      checksheet.result("data-centric"),
      1,
      "data-centric"
    );

    missingCourses = _.concat(missingCourses, [core, comm, writing].flat());

    if (concentration.toUpperCase() === "CS") {
      const missingCS = validateCSRequirements(coursesPassed, checksheet);
      missingCourses = _.concat(missingCourses, missingCS);
    } else if (concentration.toUpperCase() === "DCC") {
      const missingDCC = validateDCCRequirements(coursesPassed, checksheet);
      missingCourses = _.concat(missingCourses, missingDCC);
    } else if (concentration.toUpperCase() === "SC") {
      const missingSC = validateSCRequirements(coursesPassed, checksheet);
      missingCourses = _.concat(missingCourses, missingSC);
    }

    result.missing_courses = missingCourses;
    result.graduation_ready = _.isEmpty(missingCourses);

    return Promise.resolve(result);
  } catch (err) {
    return Promise.reject(err);
  }
};

//  ------    Helper Checker Methods    ------

/**
 * Converts CourseInfo Objects and CoureInput Objects to arrays that can be
 * compared to during verification
 *
 * @param {typedefs.CourseInfo[]} coursesTaken
 * @param {typedefs.CourseInput[]} coursesRequired
 */
function convertToComparable(coursesTaken, coursesRequired) {
  const substitutions = {};

  const requiredCourseNames = coursesRequired.map((course) => {
    if (course.substitutes) {
      const subs = course.substitutes.map((course) => {
        return `${course.subject}${course.course_number}`;
      });
      for (let i of subs) {
        substitutions[i] = `${course.subject}${course.course_number}`;
      }
    }
    return `${course.subject}${course.course_number}`;
  });

  const takenCourseNames = coursesTaken.map((course) => {
    const crn = `${course.subj_expanded}${course.course_number}`;
    if (substitutions[crn]) {
      return substitutions[crn];
    }
    return crn;
  });

  return [takenCourseNames, requiredCourseNames];
}

async function getCoursesForGPA(admitTerm) {
  const checksheet = await getYear(getAcademicYear(admitTerm)).catch((err) =>
    Promise.reject(err)
  );

  const core = checksheet.result["core"];
  const cs3xxx = checksheet.result["3xxx"];
  const cs45xxx = checksheet.result["45xxx"];
  const technical = checksheet.result["technical"];
  const cs = checksheet.result["cs"];
  const theory = checksheet.result["cs"];
  const dcc = checksheet.result["dcc"];
  const secure = checksheet.result["secure"];

  /** @type {typedefs.CourseInput[]} */
  let requiredCourses = [];

  requiredCourses = _.concat(
    requiredCourses,
    [core, cs3xxx, cs45xxx, technical, cs, theory, dcc, secure].flat()
  );

  for (let course of requiredCourses) {
    if (course?.substitutes) {
      requiredCourses = _.concat(
        requiredCourses,
        _.map(course.substitutes, (elem) =>
          _.extend({}, elem, { repeatable: course.repeatable })
        )
      );
    }
  }

  return Promise.resolve(requiredCourses);
}

/**
 * Finds the courses that match the category w/o double counting those already accounted for
 * @param {typedefs.CourseInfo[]} coursesTaken array of courses taken by student
 * @param {typedefs.CourseInput[]} coursesRequired array of courses for a requirement
 * @param {string[]} accountedFor array of courses from coursesTaken that are already being counted toward other requirements
 */
function findOverlap(coursesTaken, coursesRequired, accountedFor) {
  const compare = convertToComparable(coursesTaken, coursesRequired);
  const overlap = _.intersection(compare[0], compare[1]);
  return _.difference(overlap, accountedFor);
}

/**
 * Ensures student has the minimum number of credits in the given category
 * @param {typedefs.CourseInfo[]} coursesTaken
 * @param {typedefs.CourseInput[]} coursesRequired
 * @param {number} minimum
 * @param {string} category
 */
function verifyMinNumber(coursesTaken, coursesRequired, minimum, category) {
  const compare = convertToComparable(coursesTaken, coursesRequired);
  const overlap = _.intersection(compare[0], compare[1]);

  if (overlap.length < minimum) {
    return `Missing ${minimum} ${category} credit`;
  }
  return [];
}

function verifyCount(coursesTaken, coursesRequired) {
  const compare = convertToComparable(coursesTaken, coursesRequired);
  const overlap = _.intersection(compare[0], compare[1]);

  return overlap.length;
}

/**
 * Checks if a student has taken all courses from a required list.
 *
 * @param {typedefs.CourseInfo[]} coursesTaken An array of courses the student has taken.
 * @param {typedefs.CourseInput[]} coursesRequired An array of required courses a student must take.
 * @returns A list of the missing courses.
 */
function verifyAll(coursesTaken, coursesRequired) {
  const compare = convertToComparable(coursesTaken, coursesRequired);
  const missingCourses = _.difference(compare[1], compare[0]);

  return missingCourses;
}

/**
 * Validate student has taken all courses for CS concentration
 * @param {typedefs.CourseInfo} coursesTaken
 * @param {*} checksheet
 * @returns
 */
function validateCSRequirements(coursesTaken, checksheet) {
  let missingCourses = [];
  let accountedFor = [];

  const cs = verifyAll(coursesTaken, checksheet.result["cs"]);
  const stat = verifyMinNumber(
    coursesTaken,
    checksheet.result["statistics"],
    1,
    "statistics"
  );
  missingCourses = missingCourses.concat([cs, stat].flat());

  //Handle Theory
  const theory = findOverlap(
    coursesTaken,
    checksheet.result["theory"],
    accountedFor
  );
  if (theory.length >= 1) {
    //Covers theory
    accountedFor = accountedFor.concat([theory[0]]);
  } else {
    //Doesn't cover theory
    missingCourses = missingCourses.concat([`Missing 1 theory credit`]);
  }
  //Handle Capstone
  const capstone = findOverlap(
    coursesTaken,
    checksheet.result["capstone"],
    accountedFor
  );
  if (capstone.length >= 1) {
    //Covers capstone
    accountedFor = accountedFor.concat([capstone[0]]);
  } else {
    //Doesn't cover capstone
    missingCourses = missingCourses.concat([`Missing 1 capstone credit`]);
  }
  //Handle 4/5XXX
  const classes45xxx = [
    checksheet.result["45xxx"],
    _.filter(
      checksheet.result["secure"],
      (course) => Math.floor(parseInt(course.course_number) / 1000) >= 4
    ),
    _.filter(
      checksheet.result["dcc"],
      (course) => Math.floor(parseInt(course.course_number) / 1000) >= 4
    ),
    _.filter(
      checksheet.result["theory"],
      (course) => Math.floor(parseInt(course.course_number) / 1000) >= 4
    ),
    _.filter(
      checksheet.result["capstone"],
      (course) => Math.floor(parseInt(course.course_number) / 1000) >= 4
    ),
  ].flat();
  const cs45xxx = findOverlap(coursesTaken, classes45xxx, accountedFor);
  if (cs45xxx.length >= 4) {
    //Covers 3/4/5XXX and Technical
    return missingCourses;
  } else if (cs45xxx.length > 0) {
    //Covers at least 4/5XXX
    accountedFor = accountedFor.concat(cs45xxx);
  } else {
    //Doesn't cover 4/5XXX
    missingCourses = missingCourses.concat([`Missing 1 4/5XXX credit`]);
  }
  //Handle 3XXX
  const classes3xxx = [
    checksheet.result["3xxx"],
    _.filter(
      checksheet.result["secure"],
      (course) => Math.floor(parseInt(course.course_number) / 1000) === 3
    ),
    _.filter(
      checksheet.result["dcc"],
      (course) => Math.floor(parseInt(course.course_number) / 1000) === 3
    ),
    _.filter(
      checksheet.result["theory"],
      (course) => Math.floor(parseInt(course.course_number) / 1000) === 3
    ),
    _.filter(
      checksheet.result["capstone"],
      (course) => Math.floor(parseInt(course.course_number) / 1000) === 3
    ),
  ].flat();
  const cs3xxx = findOverlap(coursesTaken, classes3xxx, accountedFor);

  let mc = 0; //Counter for missing courses
  if (cs45xxx.length <= 1) {
    if (cs3xxx.length >= 3) {
      //Covers all of 3/4/5XXX and Technical
      return missingCourses;
    } else if (cs3xxx.length < 2) {
      //Not covering all of 3/4/5XXX
      mc = 2 - cs3xxx.length;
      missingCourses = missingCourses.concat([
        `Missing ${mc} 3XXX credit${mc > 1 ? "s" : ""}`,
      ]);
      //Still needs technical
    } //Two or Less cs3xxx still needs technical
  } else if (cs45xxx.length == 2) {
    if (cs3xxx.length >= 2) {
      //Covers all of 3/4/5XXX and Technical
      return missingCourses;
    } else if (cs3xxx.length == 0) {
      missingCourses = missingCourses.concat([`Missing 1 3XXX credit`]);
      //Still needs technical
    } //One or Less cs3xxx still needs technical
  } else if (cs45xxx.length == 3) {
    //All of 3/4/5XXX covered
    if (cs3xxx.length >= 1) {
      //Covers Technical too
      return missingCourses;
    } //Otherwise still need technical
  }
  //Handle technical
  const tech = findOverlap(
    coursesTaken,
    checksheet.result["technical"],
    accountedFor
  );
  if (tech.length > 0) {
    //Covers  Technical
    return missingCourses;
  }
  missingCourses = missingCourses.concat(["Missing 1 technical credit"]);
  return missingCourses;
}

function validateDCCRequirements(coursesTaken, checksheet) {
  let missingCourses = [];

  const dataSpecificCapstones = _.filter(checksheet.result["capstone"], {
    conc_eligible: "DCC",
  });
  const dataSpecificStats = _.filter(checksheet.result["statistics"], {
    conc_eligible: "DCC",
  });
  const electives = [
    checksheet.result["3xxx"],
    checksheet.result["45xxx"],
    checksheet.result["technical"],
    _.filter(
      checksheet.result["cs"],
      (course) => Math.floor(parseInt(course.course_number) / 1000) >= 3
    ).flat(), //Requires Number
    _.filter(
      checksheet.result["dcc"],
      (course) => Math.floor(parseInt(course.course_number) / 1000) >= 3
    ).flat(), //Requires Number
  ];
  const dataSpecificElectives = _.filter(electives, { conc_eligible: "DCC" });

  const electiveCount = verifyCount(coursesTaken, dataSpecificElectives);

  if (electiveCount < 4) {
    missingCourses = _.concat(
      missingCourses,
      `Missing ${4 - electiveCount} DCC electives`
    );
  }

  if (electiveCount >= 4 && electiveCount < 6) {
    // reject to prevent double count
    const otherElectives = _.reject(electives, { conc_eligible: "DCC" });
    const csElectives = verifyMinNumber(
      coursesTaken,
      otherElectives,
      6 - electiveCount,
      "3xxx or technical"
    );
    missingCourses = _.concat(missingCourses, csElectives);
  }

  const capstone = verifyMinNumber(
    coursesTaken,
    dataSpecificCapstones,
    1,
    "capstone"
  );
  const stat = verifyMinNumber(
    coursesTaken,
    dataSpecificStats,
    1,
    "statistics"
  );
  const dcc = verifyAll(coursesTaken, checksheet.result["dcc"]);

  missingCourses = _.concat(missingCourses, [stat, dcc, capstone].flat());

  return missingCourses;
}

function validateSCRequirements(coursesTaken, checksheet) {
  let missingCourses = [];

  const secureSpecificCapstones = _.filter(checksheet.result["capstone"], {
    conc_eligible: "Secure",
  });
  const electives = [
    checksheet.result["3xxx"],
    checksheet.result["45xxx"],
    checksheet.result["technical"],
    _.filter(
      checksheet.result["cs"],
      (course) => Math.floor(parseInt(course.course_number) / 1000) >= 3
    ).flat(), //Requires Number
    _.filter(
      checksheet.result["secure"],
      (course) => Math.floor(parseInt(course.course_number) / 1000) >= 3
    ).flat(), //Requires Number
  ];
  const secureSpecificElectives = _.filter(electives, {
    conc_eligible: "Secure",
  });

  const electiveCount = verifyCount(coursesTaken, secureSpecificElectives);

  if (electiveCount < 3) {
    missingCourses = _.concat(
      missingCourses,
      `Missing ${3 - electiveCount} Secure electives`
    );
  }

  if (electiveCount >= 3 && electiveCount < 5) {
    // reject to prevent double count
    const otherElectives = _.reject(electives, { conc_eligible: "Secure" });
    const csElectives = verifyMinNumber(
      coursesTaken,
      otherElectives,
      5 - electiveCount,
      "3xxx or technical"
    );
    missingCourses = _.concat(missingCourses, csElectives);
  }

  const capstone = verifyMinNumber(
    coursesTaken,
    secureSpecificCapstones,
    1,
    "capstone"
  );
  const stat = verifyMinNumber(
    coursesTaken,
    checksheet.result["statistics"],
    1,
    "statistics"
  );
  const secure = verifyAll(coursesTaken, checksheet.result["secure"]);

  missingCourses = _.concat(missingCourses, [stat, secure, capstone].flat());

  return missingCourses;
}
