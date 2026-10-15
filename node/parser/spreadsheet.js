// node/parser/spreadsheet.js
// Purpose: Read PTD Excel inputs and write PTD Excel outputs (no P91 styling).

const fs = require("fs");
const path = require("path");
const xlsx = require("xlsx");

// Small helpers
const rowIndexOffset = 2;
const colIndexOffset = 1;

function pick(row, keys) {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== null) return row[k];
  }
  return undefined;
}

function toNumber(maybe) {
  if (maybe === undefined || maybe === null || maybe === "") return null;
  // keep only digits
  const s = String(maybe).replace(/[^0-9]/g, "");
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/**
 * Reads the “course history / progress” Excel and returns:
 * {
 *   [studentId]: {
 *      name, standingMessage, admitTerm, currentTerm, concentration,
 *      advisorLName, overallHoursAttempted, overallGPA, transferHoursEarned,
 *      inMajorGPA: 0,
 *      spreadsheetIndex, courses: [{ subjExpanded, courseNumber, termTaken, creditHours, grade, spreadsheetIndex }]
 *   }
 * }
 */
function readCourseExcelFile(filePath) {
  try {
    const wb = xlsx.readFile(filePath);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json(ws);

    /** @type {Record<string, any>} */
    const students = {};

    rows.forEach((row, rowIndex) => {
      const id =
        pick(row, ["ID", "Id", "Student ID", "STUDENT ID"]) ??
        pick(row, ["StudentId", "student_id"]);
      if (!id) return;

      const name =
        pick(row, ["name", "Name", "STUDENT NAME", "Student Name"]) ?? "";
      const standingMessage =
        pick(row, [
          "standing_message",
          "Standing Message",
          "STANDING MESSAGE",
        ]) ?? "";
      const admitTerm =
        toNumber(pick(row, ["admit_term", "ADMIT TERM", "Admit Term"])) ?? null;
      const termTaken = toNumber(
        pick(row, ["term_taken", "TERM TAKEN", "Term Taken"])
      );
      const advisorLName =
        pick(row, [
          "advisor_last_name",
          "ADVISOR LAST NAME",
          "Advisor Last Name",
        ]) || "None";
      const overallHoursAttempted =
        Number(pick(row, ["overall_hrs_attempted", "OVERALL HRS ATTEMPTED"])) ||
        0;
      const overallGPA = Number(pick(row, ["overall_gpa", "OVERALL GPA"])) || 0;
      const transferHoursEarned =
        Number(pick(row, ["transfer_hrs_earned", "TRANSFER HRS EARNED"])) || 0;

      const subjExpanded =
        pick(row, ["subj_expanded", "SUBJ EXPANDED", "Subject"]) || "";
      const courseNumber = String(
        pick(row, ["crse_numb", "CRSE NUMB", "Course Number"]) ?? ""
      );
      const creditHours =
        Number(pick(row, ["credit_hours", "CREDIT HOURS"])) || 0;
      const grade = pick(row, ["grade", "GRADE"]) ?? "";

      if (!students[id]) {
        students[id] = {
          name,
          standingMessage,
          admitTerm, // may be null; we will infer later if needed
          currentTerm: termTaken || 0,
          advisorLName,
          overallHoursAttempted,
          overallGPA,
          transferHoursEarned,
          inMajorGPA: 0,
          spreadsheetIndex: rowIndex + rowIndexOffset,
          courses: [],
        };
      } else {
        // keep the max current term we’ve seen
        if (termTaken && termTaken > students[id].currentTerm) {
          students[id].currentTerm = termTaken;
        }
        // prefer non-null admitTerm if not set
        if (!students[id].admitTerm && admitTerm) {
          students[id].admitTerm = admitTerm;
        }
      }

      // push this course row (even if some fields are empty)
      students[id].courses.push({
        subjExpanded,
        courseNumber,
        termTaken: termTaken || 0,
        creditHours,
        grade,
        spreadsheetIndex: rowIndex + rowIndexOffset,
      });
    });

    // Final pass: if admitTerm is still null, infer from earliest course term or currentTerm
    for (const sid of Object.keys(students)) {
      const s = students[sid];
      if (!s.admitTerm) {
        const terms = s.courses
          .map((c) => toNumber(c.termTaken))
          .filter(Boolean);
        const earliest = terms.length ? Math.min(...terms) : null;
        s.admitTerm = earliest || toNumber(s.currentTerm) || null;
      }
    }

    return students;
  } catch (err) {
    throw new Error(
      "Error parsing Progress Toward Degree Excel file. Please ensure it follows the expected format."
    );
  }
}

/**
 * Reads the “full data” Excel and returns:
 * {
 *   [studentId]: {
 *     emailAddress, completionTermCode, citizenCode, transferFlag, cadetFlag,
 *     studentClassDesc, selfReportedVeteranFlag
 *   }
 * }
 */
function readFullDataExcelFile(filePath) {
  try {
    const wb = xlsx.readFile(filePath);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json(ws);

    /** @type {Record<string, any>} */
    const res = {};

    rows.forEach((row) => {
      const id =
        pick(row, ["STUDENT ID", "Student ID", "ID", "Id", "student_id"]) ??
        null;
      if (!id) return;

      // New: parse advisor name from DW and extract last name.
      // Example DW header: ADVISOR NAME   value: "Parker, Barbara"
      const advisorFullName =
        pick(row, ["ADVISOR NAME", "Advisor Name"]) || "";
      let advisorLastName = null;
      if (advisorFullName) {
        const parts = String(advisorFullName).split(",");
        advisorLastName = (parts[0] || "").trim() || null;
      }
      // CS major unless specified otherwise
      let concentration = "CS";
      // Hardcoded check for concentrations
      let value = pick(row, ["PRIMARY MAJOR CODE"]);
      // Pick returns undefined if the column doesn't exist and === in js doesn't throw an error if one is undefined just returns false
      if (value === "DCC" || value === "SC") {
        concentration = value;
      }
      // Hardcoded check for CS Minor, the data warehouse file has 6 minor columns (MINOR-1 CODE, MINOR-2 CODE...)
      for (let i = 1; i < 7; i++) {
        // Make sure the Minor is CS, if they are a CS minor they aren't also a CS major so we don't have to worry about overwriting concentration=CS incorrectly
        if (pick(row, ["MINOR-" + i + " CODE"]) === "CS") {
          concentration = "MIN";
        }
      }
      res[id] = {
        emailAddress:
          pick(row, ["EMAIL ADDRESS", "Email Address", "email"]) || "N/A",
        completionTermCode:
          toNumber(
            pick(row, ["COMPLETION TERM CODE", "Completion Term Code"])
          ) || 0,
        citizenCode: pick(row, ["CITIZEN CODE", "Citizen Code"]) || null,
        transferFlag:
          String(pick(row, ["TRANSFER FLAG"]) || "").toUpperCase() === "Y",
        cadetFlag:
          String(pick(row, ["CADET FLAG"]) || "").toUpperCase() === "Y",
        studentClassDesc:
          pick(row, ["STUDENT CLASS DESC", "Student Class Desc"]) || null,
        selfReportedVeteranFlag:
          String(
            pick(row, ["SELF REPORTING VETERAN STATUS IND"]) || ""
          ).toUpperCase() === "Y",
        advisorLastName,
        concentration
      };
    });

    return res;
  } catch (err) {
    throw err;
  }
}


/**
 * Minimal, P91-free Excel writer.
 * workbookData = { sheets: { [sheetName]: Array<object> } }
 */
function outputToExcel(workbookData, outPath) {
  if (!workbookData || !workbookData.sheets) {
    throw new Error("outputToExcel: 'sheets' is required");
  }
  const wb = xlsx.utils.book_new();

  // “Full Analysis” first, then alpha
  const names = Object.keys(workbookData.sheets).sort((a, b) => {
    if (a === "Full Analysis") return -1;
    if (b === "Full Analysis") return 1;
    return a.localeCompare(b);
  });

  for (const name of names) {
    const rows = Array.isArray(workbookData.sheets[name])
      ? workbookData.sheets[name]
      : [];
    const ws = xlsx.utils.json_to_sheet(rows);
    xlsx.utils.book_append_sheet(wb, ws, sanitizeSheetName(name));
  }

  const dir = path.dirname(outPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  xlsx.writeFile(wb, outPath);
}

// Excel sheet name constraints
function sanitizeSheetName(name) {
  const trimmed = String(name || "Sheet").slice(0, 31);
  return trimmed.replace(/[:\\/?*\[\]]/g, "_") || "Sheet";
}

module.exports = {
  rowIndexOffset,
  colIndexOffset,
  readCourseExcelFile,
  readFullDataExcelFile,
  outputToExcel,
};
