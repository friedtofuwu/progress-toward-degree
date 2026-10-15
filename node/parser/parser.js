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

// Better grades have LOWER index
const LETTER_GRADES_ORDERED = [
  "A", "A-",
  "B+", "B", "B-",
  "C+", "CC", "C", "C-",
  "D+", "D", "D-",
];

function letterGradeIndex(grade) {
  const g = String(grade || "").trim().toUpperCase();
  const idx = LETTER_GRADES_ORDERED.indexOf(g);
  return idx; // -1 means "not a regular letter grade"
}


/**
 * This class processes student information from excel sheets into a format that
 * can be insert into the database (hence the underscore syntax to fit the
 * columns)
 *
 * Also appends flags for Policy91 violations and Graduation eligibility
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
module.exports.analyzeStudents = async (
  courseInfo,
  fullDataInfo,
  filters = {}
) => {
  const result = {
    flags: [],
    courses: [],
    students: [],
    additional: [],
  };

  // Normalize optional filters from audit import
  const advisorFilter =
    filters && typeof filters.advisor_lname === "string"
      ? filters.advisor_lname.trim().toLowerCase()
      : "";
  const hasAdvisorFilter = advisorFilter.length > 0;

  let concFilterSet = null;
  if (
    filters &&
    typeof filters.concentrations === "string" &&
    filters.concentrations.trim().length > 0
  ) {
    concFilterSet = new Set(
      filters.concentrations
        .split(",")
        .map((c) => c.trim().toUpperCase())
        .filter(Boolean)
    );
  }

  let gradTermFilterSet = null;
  if (
    filters &&
    typeof filters.grad_terms === "string" &&
    filters.grad_terms.trim().length > 0
  ) {
    gradTermFilterSet = new Set(
      filters.grad_terms
        .split(",")
        .map((g) => g.trim())
        .filter(Boolean)
    );
  }

  try {
    // First pass: build base student records and flags
    for (let id in courseInfo) {
      const student = courseInfo[id];

      // Look up matching DW row, if any
      const extraInfo =
        fullDataInfo && fullDataInfo[id] ? fullDataInfo[id] : null;

      if (extraInfo === null) {
        // If we have student course info from ptd but not additional info from dw we can't run an audit on them
        continue;
      }

      // Apply concentration filter if present (CS, DCC, SC, Minor, etc)
      // Prefer the PTD concentration if it exists, otherwise fall back to DW (if present),
      // then normalize/clamp so it fits in VARCHAR(3)
      const rawConc =
        student.concentration != null
          ? student.concentration
          : extraInfo.concentration;
      student.concentration = normalizeConcentration(rawConc);

      // Apply concentration filter if present (CS, DCC, SC, MIN, etc)
      if (concFilterSet && concFilterSet.size > 0) {
        const conc = String(student.concentration || "").toUpperCase();
        if (!concFilterSet.has(conc)) {
          continue;
        }
      }


      // If PTD did not provide advisorLName, but DW did, copy it over
      if (
        (!student.advisorLName || student.advisorLName === "None") &&
        extraInfo &&
        extraInfo.advisorLastName
      ) {
        student.advisorLName = extraInfo.advisorLastName;
      }

      // Apply advisor last name filter if present
      if (hasAdvisorFilter) {
        const advisorName = String(student.advisorLName || "").toLowerCase();
        if (advisorName !== advisorFilter) {
          continue;
        }
      }

      // Apply concentration filter if present (CS, DCC, SC, Minor, etc)
      if (concFilterSet && concFilterSet.size > 0) {
        const conc = String(student.concentration || "").toUpperCase();
        if (!concFilterSet.has(conc)) {
          continue;
        }
      }

      // Apply graduation term filter if present
      if (gradTermFilterSet && gradTermFilterSet.size > 0) {
        const termCodeStr =
          extraInfo && extraInfo.completionTermCode != null
            ? String(extraInfo.completionTermCode)
            : "";
        if (!gradTermFilterSet.has(termCodeStr)) {
          continue;
        }
      }

      const { info, flags, courses } = await handlePolicyFlags(
        parseInt(id),
        student
      );
      result.courses = _.concat(result.courses, courses);
      result.flags = _.concat(result.flags, flags);
      result.students = _.concat(result.students, info);
    }

    // Second pass: add "additional" info per student using fullDataInfo
    for (let id in courseInfo) {
      const fieldInfo =
        id in fullDataInfo
          ? fullDataInfo[id]
          : { emailAddress: "N/A", completionTermCode: 0 };

      /** @type {typedefs.StudentInfo} */
      const student = _.find(result.students, ["id", parseInt(id)]);

      // If the student did not pass the filters above, they will not be in result.students
      if (student) {
        const courses = _.filter(result.courses, ["student_id", parseInt(id)]);

        const additional = await handleGradFlags(
          student.concentration,
          student.admit_term,
          courses,
          student.id,
          fieldInfo,
          student.in_major_gpa,
          student.overall_hours_attempted,
          student.transfer_hours_earned,
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
 * add policy91 flags to student
 *
 * @param {typedefs.Student} student student's information
 * @param {number} id student's ID number
 *
 * @returns student info, flags, and courses taken by student
 */
const handlePolicyFlags = async (id, student) => {
  try {
    const result = {
      info: {},
      flags: [],
      courses: [],
    };

    // ... all your GPA / flags logic ...

    // --------- massage and batch data for database insertion ---------

    // De-dupe courses for this student by key
    // De-dupe courses for this student by key
    // --------- massage and batch data for database insertion ---------

    // One row per (student, subj, course, term).
    // If there are duplicate rows in the SAME term (data weirdness), keep the best grade:
    //   • Prefer a real letter grade over F/W/blank
    //   • Among letters, use LETTER_GRADES_ORDERED to pick the better one
    const byKey = new Map();

    for (const course of student.courses) {
      const key = [
        id,
        course.subjExpanded,
        course.courseNumber,
        course.termTaken,
      ].join("|");

      const candidate = {
        student_id: id,
        subj_expanded: course.subjExpanded,
        course_number: course.courseNumber,
        term_taken: course.termTaken,
        credit_hours: course.creditHours,
        grade: course.grade,
      };

      const existing = byKey.get(key);
      if (!existing) {
        byKey.set(key, candidate);
        continue;
      }

      const existingIdx = letterGradeIndex(existing.grade);
      const candIdx = letterGradeIndex(candidate.grade);

      if (existingIdx === -1 && candIdx !== -1) {
        // Existing is F/W/blank/other, candidate is a real letter → upgrade
        byKey.set(key, candidate);
      } else if (existingIdx !== -1 && candIdx !== -1 && candIdx < existingIdx) {
        // Both are letters; smaller index is a better grade
        byKey.set(key, candidate);
      }
      // Otherwise keep what we already had (same or better grade, or both non-letters)
    }

    // Now push the chosen rows into result.courses
    result.courses = Array.from(byKey.values());



    // ------------- calculate flags -------------

    // In major GPA calculated from all classes taken by student w/ CS subject
    /** All courses taken by the student within CS subject */
    const csCourses = _.filter(student.courses, function (o) {
      return o.subjExpanded == "CS";
    });
    let qualityCredits = 0;
    let creditHours = 0;
    csCourses.forEach((course) => {
      // Can only calculate with valid grades
      if (course.grade in inMajorGradePoints && course.grade !== "") {
        qualityCredits += course.creditHours * inMajorGradePoints[course.grade];
        creditHours += course.creditHours;
      }
    });
    const unsantizedGPA = parseFloat((qualityCredits / creditHours).toFixed(2));
    const inMajorGPA = isNaN(unsantizedGPA) ? 0 : unsantizedGPA;
    

    /** Array of courses required based on admission term */
    /** Array of courses required based on admission term */
    const rawRequired = await getCoursesForGPA(student.admitTerm);

    // If getCoursesForGPA returns null/undefined for some majors/years,
    // fall back to an empty array instead of crashing.
    const requiredCourses = (rawRequired || []).filter((rc) => !!rc);

    /** Array of required courses subject, course#, repeatability, and passing grade */
    const condensedRequired = requiredCourses.map(course => ({
      subjExpanded: course.subject,
      courseNumber: course.course_number,
      repeatable: course.repeatable,
      passingGrade: course.passing_grade,
    }));


    // not using a filter here so as to append if the course is repeatable which makes it
    // easier to check in highestGrades as well as the courses passing grade
    /**
     * Array of courses student took that are required by major with the added repeatable
     * tag and passing grade
     */
    let inMajorCourses = _.map(student.courses, (course) => {
      let isRequired = _.find(condensedRequired, {
        subjExpanded: course.subjExpanded,
        courseNumber: course.courseNumber,
      });
      return isRequired
        ? _.extend({}, course, {
          repeatable: isRequired.repeatable,
          passingGrade: isRequired.passingGrade,
        })
        : null;
    });
    // removing the nulls left by the map function removing the non required courses
    inMajorCourses = _.compact(_.flattenDeep(inMajorCourses));

    // Checking student is actively taking at least one required 3 credit course
    const currentCourses = _.filter(inMajorCourses, function (o) {
      return o.termTaken == student.currentTerm && o.creditHours == 3;
    });
    if (_.isEmpty(currentCourses)) {
      result.flags.push({
        student_id: id,
        type: FLAG_MISSING_REQUIRED_COURSE,
      });
    }

    //Doesn't do warning checking for either of these...
    const possiblePassingGrades = [
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
    let failed = 0;
    let repeats = [];
    _.map(
      _.groupBy(
        inMajorCourses,
        (course) => `${course.subjExpanded}${course.courseNumber}`
      ),
      (courses) => {
        if (courses[0].subjExpanded == "CS" && !courses[0].repeatable) {
          //Only care if it's in the CS subject and not repeatable
          //Find what index would be considered passing
          let passingIndex = possiblePassingGrades.indexOf(
            courses[0].passingGrade
          );
          //Find the most recent attempt (can't retake after passing)
          let mostRecent = _.maxBy(courses, (course) =>
            parseInt(course.termTaken)
          );
          //Ignore classes they're taking for the first time or still attempting for the second
          if (courses.length < 3 && mostRecent.grade == "") return;
          let topGradeIndex = possiblePassingGrades.indexOf(mostRecent.grade);
          // Check if they haven't passed the course yet
          if (topGradeIndex == -1 || topGradeIndex > passingIndex) {
            if (courses.length > 2) {
              //Needs a third attempt
              //console.log(courses[0].subjExpanded,courses[0].courseNumber,"Needs third attempt");
              result.flags.push({
                student_id: id,
                type: FLAG_THREE_REPEATS,
                isWarning: false,
                associatedCourses: courses,
              });
            }
            repeats.push(courses);
            failed++;
          }
        }
      }
    );
    if (repeats.length > 3) {
      result.flags.push({
        student_id: id,
        type: FLAG_FOUR_TOTAL_REPEATS,
        isWarning: false, //failed <= 3,
        associatedCourses: _.flattenDeep(repeats),
      });
    }

    result.info.id = id;
    result.info.name = student.name;
    result.info.standing_message = student.standingMessage;
    result.info.admit_term = student.admitTerm;
    result.info.current_term = student.currentTerm;
    result.info.concentration = normalizeConcentration(student.concentration);
    result.info.advisor_lname = student.advisorLName;
    result.info.overall_hours_attempted = student.overallHoursAttempted;
    result.info.overall_gpa = student.overallGPA;
    result.info.transfer_hours_earned = student.transferHoursEarned;
    result.info.in_major_gpa = inMajorGPA;

    //console.log(id,":")
    //result.flags.forEach(flag => {
    //    console.log("\t",JSON.stringify(flag));
    //});

    return Promise.resolve(result);
  } catch (err) {
    return Promise.reject(err);
  }
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
  student,
  inMajorGPA,
  overallCredits,
  transferCredits
) => {
  try {
    // helpers (local to this function)
    const onlyDigits = (v) =>
      v == null ? "" : String(v).replace(/[^0-9]/g, "");
    const coerceTerm = (v) => {
      const n = Number(onlyDigits(v));
      return Number.isFinite(n) ? n : null;
    };

    /** @type {typedefs.AdditionalStudentInfo} */
    const result = {};

    result.id = id;
    result.email_address = student.emailAddress;
    result.completion_term_code = student.completionTermCode;
    result.citizen_code = student.citizenCode;
    result.transfer_flag = student.transferFlag;
    result.cadet_flag = student.cadetFlag;
    result.student_class_desc = student.studentClassDesc;
    result.self_reported_veteran_flag = student.selfReportedVeteranFlag;

    // robust year inference
    // 1) prefer admitTerm if usable
    let term = coerceTerm(admitTerm);

    // 2) else infer from earliest course term
    if (!term && Array.isArray(coursesTaken) && coursesTaken.length) {
      const terms = coursesTaken
        .map((c) => coerceTerm(c.term_taken ?? c.termTaken))
        .filter(Boolean);
      if (terms.length) term = Math.min(...terms);
    }

    // 3) derive academic year
    let year = null;
    if (term) {
      year = Number(getAcademicYear(term));
      if (!Number.isFinite(year)) {
        // fallback to first 4 digits of the term code
        year = Number(String(term).slice(0, 4));
      }
    }

    if (!Number.isFinite(year) || !year) {
      throw new Error(
        `Could not determine checksheet year (admitTerm='${admitTerm}'). ` +
        `Verify the spreadsheet has a valid Admit Term or course term codes.`
      );
    }

    const checksheet = await getYear(year);

    //Get map of checksheet courses to passing grade
    delete checksheet.result.year;
    const courseMap = {};
    Object.values(checksheet.result)
      .flat()
      .forEach((c) => {
        if (!c) return;

        courseMap[c.subject + c.course_number] = c.passing_grade;

        if (Array.isArray(c.substitutes)) {
          c.substitutes.forEach((s) => {
            courseMap[s.subject + s.course_number] = "D-"; // Default passing grade
          });
        }
      });

    // Restrict coursesTaken to only the first attempt that either:
    //   • meets the per-course passing_grade (real pass), OR
    //   • has a blank grade (in-progress) if there is no passing grade yet.
    // This gives us an "on track" view for graduation readiness.
    const possiblePassingGrades = [
      "P",
      "T",
      "A", "A-",
      "B+", "B", "B-",
      "C+", "CC", "C", "C-",
      "D+", "D", "D-",
    ];

    // Group all attempts for the same course code (subject+number)
    const byCourseCode = _.groupBy(
      coursesTaken,
      (course) => `${course.subj_expanded}${course.course_number}`
    );

    // This is now "coursesOnTrack": either actually passed, or currently in progress
    const coursesOnTrack = [];

    for (const [code, attempts] of Object.entries(byCourseCode)) {
      const passingGrade = courseMap[code];
      if (!passingGrade) continue; // course not in checksheet (not required)

      const passingIndex = possiblePassingGrades.indexOf(passingGrade);
      if (passingIndex === -1) continue;

      // sort attempts by term, earliest first
      const sorted = _.sortBy(
        attempts,
        (c) => Number(c.term_taken ?? c.termTaken ?? 0)
      );

      let chosen = null;

      // 1) Prefer the first *real passing* grade attempt
      for (const att of sorted) {
        const gradeIndex = possiblePassingGrades.indexOf(att.grade);
        if (gradeIndex !== -1 && gradeIndex <= passingIndex) {
          chosen = att;
          break;
        }
      }

      // 2) If no real passing grade yet, but there is a blank (in-progress) attempt,
      //    treat the earliest blank as "on track".
      if (!chosen) {
        const inProgress = sorted.find((att) => {
          const g = String(att.grade || "").trim();
          return g === "";
        });

        if (inProgress) {
          chosen = inProgress;
        }
      }

      if (chosen) {
        coursesOnTrack.push(chosen);
      }
    }

    // Find missing courses
    let missingCourses = [];
    let accountedFor = [];

    const core = verifyAll(coursesOnTrack, checksheet.result["core"]);
    const comm = verifyMinNumber(
      coursesOnTrack,
      checksheet.result["communications"],
      1,
      "communications"
    );
    const writing = verifyMinNumber(
      coursesOnTrack,
      checksheet.result["writing"],
      1,
      "writing"
    );
    const pathways1 = verifyMinCredits(
      coursesOnTrack,
      checksheet.result["1"],
      6,
      "pathways concept 1",
      accountedFor
    );
    const pathways2 = verifyMinCredits(
      coursesOnTrack,
      checksheet.result["2"],
      6,
      "pathways concept 2",
      accountedFor
    );
    const pathways3 = verifyMinCredits(
      coursesOnTrack,
      checksheet.result["3"],
      6,
      "pathways concept 3",
      accountedFor
    );
    const pathways4 = verifyMinCredits(
      coursesOnTrack,
      checksheet.result["4"],
      8,
      "pathways concept 4",
      accountedFor
    );
    const pathways5 = verifyMinCredits(
      coursesOnTrack,
      checksheet.result["5"],
      11,
      "pathways concept 5",
      accountedFor
    );
    const pathways6 = verifyMinCredits(
      coursesOnTrack,
      checksheet.result["6"],
      4,
      "pathways concept 6",
      accountedFor
    );
    const pathways6a = verifyMinCredits(
      coursesOnTrack,
      checksheet.result["6a"],
      3,
      "pathways concept 6a",
      accountedFor
    );

    missingCourses = _.concat(
      missingCourses,
      [
        core,
        comm,
        writing,
        pathways1,
        pathways2,
        pathways3,
        pathways4,
        pathways5,
        pathways6,
        pathways6a,
      ].flat()
    );

  //   if (concentration.toUpperCase() === "CS") {
  //     const missingCS = validateCSRequirements(coursesOnTrack, checksheet);
  //     missingCourses = _.concat(missingCourses, missingCS);
  //     if (overallCredits < 123 || inMajorGPA < 2.0){
  //       result.graduation_ready = false;
  //       result.missing_courses = missingCourses;
  //       return Promise.resolve(result);
  //     }
      

  //   } else if (concentration.toUpperCase() === "DCC") {
  //     const missingDCC = validateDCCRequirements(coursesOnTrack, checksheet);
  //     missingCourses = _.concat(missingCourses, missingDCC);
  //     if (overallCredits < 123 || inMajorGPA < 2.0){
  //       result.graduation_ready = false;
  //       result.missing_courses = missingCourses;
  //       return Promise.resolve(result);
  //     }

  //   } else if (concentration.toUpperCase() === "SC") {
  //     const missingSC = validateSCRequirements(coursesOnTrack, checksheet);
  //     missingCourses = _.concat(missingCourses, missingSC);
  //     if (overallCredits < 123 || inMajorGPA < 2.0){
  //       result.graduation_ready = false;
  //       result.missing_courses = missingCourses;
  //       return Promise.resolve(result);
  //     }

  //   } else if (concentration.toUpperCase() === "MIN") {
  //     const missingMinor = validateCSMinorRequirements(coursesOnTrack, checksheet);
  //     missingCourses = missingMinor;
  //     if (inMajorGPA < 2.0){
  //       result.graduation_ready = false;
  //       result.missing_courses = missingCourses;
  //       return Promise.resolve(result);
  //     }
  //   }


  //   result.missing_courses = missingCourses;
  //   result.graduation_ready = _.isEmpty(missingCourses);

  //   return Promise.resolve(result);
  // } catch (err) {
  //   return Promise.reject(err);
  // }
      overallCredits = overallCredits + (transferCredits || 0);
      const upperConcentration = concentration.toUpperCase();

      const validators = {
        CS: validateCSRequirements,
        DCC: validateDCCRequirements,
        SC: validateSCRequirements,
        MIN: validateCSMinorRequirements,
      };

      const validator = validators[upperConcentration];

      if (validator) {
        const missing = validator(coursesOnTrack, checksheet);
        // For minor, we replace missingCourses; otherwise, we concat
        missingCourses = upperConcentration === "MIN" ? missing : _.concat(missingCourses, missing);

        // Graduation check
        if ((upperConcentration !== "MIN" && (overallCredits < 123 || inMajorGPA < 2.0)) ||
            (upperConcentration === "MIN" && inMajorGPA < 2.0)) {
          result.graduation_ready = false;
          result.missing_courses = missingCourses;
          return Promise.resolve(result);
        }
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
  // Always work with arrays, even if callers pass null/undefined
  coursesTaken = Array.isArray(coursesTaken) ? coursesTaken : [];
  coursesRequired = Array.isArray(coursesRequired) ? coursesRequired : [];

  const substitutions = {};

  const requiredCourseNames = coursesRequired.map((course) => {
    if (course && Array.isArray(course.substitutes) && course.substitutes.length > 0) {
      const subs = course.substitutes.map((sub) => {
        return `${sub.subject}${sub.course_number}`;
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
  try {
    const year = getAcademicYear(admitTerm);
    const checksheet = await getYear(year);

    // If we somehow did not get a checksheet, just return an empty array
    if (!checksheet || !checksheet.result) {
      return [];
    }

    const r = checksheet.result;

    // Pull each bucket defensively; older years may not have all of these
    const core = Array.isArray(r["core"]) ? r["core"] : [];
    const cs3xxx = Array.isArray(r["3xxx"]) ? r["3xxx"] : [];
    const cs45xxx = Array.isArray(r["45xxx"]) ? r["45xxx"] : [];
    const technical = Array.isArray(r["technical"]) ? r["technical"] : [];
    const cs = Array.isArray(r["cs"]) ? r["cs"] : [];
    const theory = Array.isArray(r["theory"]) ? r["theory"] : []; // fix from "cs"
    const dcc = Array.isArray(r["dcc"]) ? r["dcc"] : [];
    const secure = Array.isArray(r["secure"]) ? r["secure"] : [];

    /** @type {typedefs.CourseInput[]} */
    let requiredCourses = [
      ...core,
      ...cs3xxx,
      ...cs45xxx,
      ...technical,
      ...cs,
      ...theory,
      ...dcc,
      ...secure,
    ];

    // Also include substitutes as separate required entries that inherit repeatability
    const expandedRequired = [];
    for (const course of requiredCourses) {
      if (!course) continue;

      expandedRequired.push(course);

      if (Array.isArray(course.substitutes) && course.substitutes.length > 0) {
        for (const sub of course.substitutes) {
          expandedRequired.push({
            ...sub,
            repeatable: course.repeatable,
          });
        }
      }
    }

    return expandedRequired;
  } catch (err) {
    // If anything goes wrong (weird admitTerm, missing year, etc.),
    // fall back to empty array instead of rejecting.
    console.warn(`getCoursesForGPA(${admitTerm}) failed:`, err);
    return [];
  }
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

  const remaining = minimum - overlap.length;

  if (remaining > 0) {
    return [`Missing ${remaining} ${category} courses`];
  }
  return [];
}

/**
 * Pathways validator that:
 *   • checks only minimum credits
 *   • prevents double-counting
 *
 * @param {typedefs.CourseInfo[]} coursesTaken
 * @param {typedefs.CourseInput[]} coursesRequired
 * @param {number} minCredits
 * @param {string} category
 * @param {string[]} accountedFor   course codes already used
 * @returns {string[]} missing messages
 */
function verifyMinCredits(
  coursesTaken,
  coursesRequired,
  minCredits,
  category,
  accountedFor
) {
  const [, requiredCodes] = convertToComparable(coursesTaken, coursesRequired);

  const eligible = coursesTaken.filter((c) => {
    const code = `${c.subj_expanded}${c.course_number}`;
    return requiredCodes.includes(code) && !accountedFor.includes(code);
  });

  const total = eligible.reduce((sum, c) => sum + c.credit_hours, 0);

  // Mark used so they can't count elsewhere
  eligible.forEach((c) =>
    accountedFor.push(`${c.subj_expanded}${c.course_number}`)
  );

  if (total < minCredits) {
    return [`Missing ${minCredits - total} credit hours in ${category}`];
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

/**
 * Validate student has taken all courses for Data Centric Computing concentration
 * @param {typedefs.CourseInfo} coursesTaken
 * @param {*} checksheet
 * @returns
 */
function validateDCCRequirements(coursesTaken, checksheet) {
  // Requirements from the DCC checksheet:
  // - 4 DCC electives
  // - 1 DCC capstone
  // - Total of 6 advanced electives (dcc + other 3/4/5XXX / technical)
  const REQUIRED_DCC_ELECTIVES = 4;
  const REQUIRED_TOTAL_ADVANCED = 6;

  let missingCourses = [];

  // 1) DCC core (CS/STAT/CMDA 3654, CS 3314, etc.)
  const dccCore = checksheet.result["data-centric"] || [];
  const dccCoreMissing = verifyAll(coursesTaken, dccCore);
  missingCourses = missingCourses.concat(dccCoreMissing);

  // 2) DCC electives (BIT 4604, CS 4804, MATH 3414, etc.)
  const dccElectives = checksheet.result["data-centric-elective"] || [];
  const dccElectiveCount = verifyCount(coursesTaken, dccElectives);

  if (dccElectiveCount < REQUIRED_DCC_ELECTIVES) {
    missingCourses.push(
      `Missing ${REQUIRED_DCC_ELECTIVES - dccElectiveCount
      } Data Centric Computing elective(s)`
    );
  }

  // 3) DCC capstone (CS 4624, CS 4664, CS 4884, etc.)
  const dccCapstones = checksheet.result["data-centric-capstone"] || [];
  const dccCapstoneCount = verifyCount(coursesTaken, dccCapstones);

  if (dccCapstoneCount < 1) {
    missingCourses.push("Missing 1 Data Centric Computing capstone courses");
  }

  // 4) Advanced electives total (dcc electives + other advanced CS/technical)
  //    Build a pool of NON-dcc advanced courses so we do not double count
  const otherAdvancedPool = [
    ...(checksheet.result["3xxx"] || []),
    ...(checksheet.result["45xxx"] || []),
    ...(checksheet.result["technical"] || []),
    ...(checksheet.result["cs"] || []).filter((c) => {
      const num = parseInt(c.course_number, 10);
      return Number.isFinite(num) && Math.floor(num / 1000) >= 3;
    }),
  ];

  const otherAdvancedCount = verifyCount(coursesTaken, otherAdvancedPool);
  const totalAdvanced = dccElectiveCount + otherAdvancedCount;

  if (totalAdvanced < REQUIRED_TOTAL_ADVANCED) {
    const needed = REQUIRED_TOTAL_ADVANCED - totalAdvanced;
    missingCourses.push(`Missing ${needed} 3XXX or technical credits`);
  }

  // 5) Statistics requirement:
  const secureStats = checksheet.result["data-centric-statistics"];

  const statMissing = verifyMinNumber(
    coursesTaken,
    secureStats,
    1,
    "Data Centric Computing Statistics"
  );

  missingCourses = missingCourses.concat(statMissing);

  return missingCourses;
}

function validateSCRequirements(coursesTaken, checksheet) {
  // Requirements from the SC checksheet:
  // - 3 Secure Computing electives
  // - 1 Secure Computing capstone
  // - Total of 5 advanced electives (secure + other 3/4/5XXX / technical)
  const REQUIRED_SECURE_ELECTIVES = 3;
  const REQUIRED_TOTAL_ADVANCED = 5;

  let missingCourses = [];

  // 1) Secure core (CS/BIT/PSCI 2164, CS 3314, CS 4264, etc.)
  const secureCore = checksheet.result["secure"] || [];
  const secureCoreMissing = verifyAll(coursesTaken, secureCore);
  missingCourses = missingCourses.concat(secureCoreMissing);

  // 2) Secure Computing electives (BIT 4604, CS 4254, MATH 4175, etc.)
  const secureElectives = checksheet.result["secure-elective"] || [];
  const secureElectiveCount = verifyCount(coursesTaken, secureElectives);

  if (secureElectiveCount < REQUIRED_SECURE_ELECTIVES) {
    missingCourses.push(
      `Missing ${REQUIRED_SECURE_ELECTIVES - secureElectiveCount
      } Secure Computing elective(s)`
    );
  }

  // 3) Secure Computing capstone (CS 4284, CS 4274, etc.)
  const secureCapstones = checksheet.result["secure-capstone"] || [];
  const secureCapstoneCount = verifyCount(coursesTaken, secureCapstones);

  if (secureCapstoneCount < 1) {
    missingCourses.push("Missing 1 Secure Computing capstone courses");
  }

  // 4) Advanced electives total (secure electives + other advanced CS/technical)
  //    Build a pool of NON-secure advanced courses so we do not double count
  const otherAdvancedPool = [
    ...(checksheet.result["3xxx"] || []),
    ...(checksheet.result["45xxx"] || []),
    ...(checksheet.result["technical"] || []),
    ...(checksheet.result["cs"] || []).filter((c) => {
      const num = parseInt(c.course_number, 10);
      return Number.isFinite(num) && Math.floor(num / 1000) >= 3;
    }),
  ];

  const otherAdvancedCount = verifyCount(coursesTaken, otherAdvancedPool);
  const totalAdvanced = secureElectiveCount + otherAdvancedCount;

  if (totalAdvanced < REQUIRED_TOTAL_ADVANCED) {
    const needed = REQUIRED_TOTAL_ADVANCED - totalAdvanced;
    missingCourses.push(`Missing ${needed} 3XXX or technical credits`);
  }

  // 5) Statistics requirement:
  //    You have both 'statistics' and 'secure-statistics' categories;
  //    use the secure-specific list when present.
  const secureStats =
    checksheet.result["secure-statistics"] ||
    [];

  const statMissing = verifyMinNumber(
    coursesTaken,
    secureStats,
    1,
    "Secure Computing Statistics"
  );

  missingCourses = missingCourses.concat(statMissing);

  return missingCourses;
}

function normalizeConcentration(raw) {
  if (raw == null) return "";
  const v = String(raw).trim().toUpperCase();
  if (!v) return "";

  // Map known patterns to short codes
  if (v === "CS") return "CS";
  if (v === "SC") return "SC";
  if (v === "DCC" || v.startsWith("DATA CENTRIC")) return "DCC";
  if (v === "MINOR" || v.startsWith("MIN")) return "MIN";

  // Fallback: hard clamp to 3 characters
  return v.slice(0, 3);
}


function validateCSMinorRequirements(coursesTaken, checksheet, inMajorGPA) {
    let missingCourses = [];

    const minorCore = verifyAll(coursesTaken, checksheet.result['cs-minor-core'])
    const minorCS34xxx = verifyMinNumber(coursesTaken, checksheet.result['cs-minor-3/4/5XXX'], 2, 'CS Minor elective')
    if(inMajorGPA < 2.0) {
        missingCourses = _.concat(missingCourses, [ 'In-Major GPA below 2.0 for CS Minor' ].flat())
    }
    
    missingCourses = _.concat(missingCourses,[ minorCS34xxx, minorCore].flat())

    return missingCourses
}


