const { DB, tableNames } = require("../handler");

/**
 * Returns all past audits for a given user (by pid, newest first)
 * @param {string} pid - User PID.
 * @returns {Promise<Array<object>>} Audit_Info rows.
 */
module.exports.getAuditHistoryByUser = (pid) => {
  // Build a parameterized query to safely filter by PID and order newest to oldest
  const sql = `
    SELECT *
    FROM Audit_Info
    ${process.env.DEMO_MODE === 'true' ? 'WHERE initiating_user_pid = ?' : ''}
    ORDER BY timestamp DESC
  `;
  // Execute the query with the PID bound as a parameter; unwrap and return rows
  return DB.query(sql, process.env.DEMO_MODE === 'true' ? [pid] : []).then(({ result }) => result);
};
// FORMER GETAUDITHISTORYBYUSER CODE
// module.exports.getAuditHistoryByUser = (pid) => {
//     return new Promise((resolve, reject) => {
//         DB.selectAll(
//             tableNames.auditInfo,
//             "initiating_user_pid = ?",
//             [pid],
//             "timestamp",
//             false
//         )
//             .then(({ result }) => resolve(result))
//             .catch((err) => reject(err));
//     });
// };


/**
 * Returns a specific audit entry by audit_id
 */
// module.exports.getAuditById = (auditId) => {
//   return new Promise((resolve, reject) => {
//     DB.selectAll(tableNames.auditInfo, "audit_id = ?", [auditId], null, false)
//       .then(({ result }) => {
//         if (result?.length === 1) {
//           resolve(result[0]);
//         } else if (result?.length === 0) {
//           resolve(null);
//         } else {
//           throw new Error(`Expected 1 row, got ${result?.length}`);
//         }
//       })
//       .catch((err) => reject(err));
//   });
// };
// node/database/utils/AuditInfo.js

module.exports.getAuditById = async (auditId) => {
  const sql = `SELECT * FROM ${tableNames.auditInfo} WHERE audit_id = ? LIMIT 1`;
  const { result } = await DB.query(sql, [auditId]);
  return result[0] || null;
};


/**
 * Insert a new audit log entry into Audit_Info and return the generated audit_id
 */
module.exports.logAudit = async (
  initiating_user_pid,
  filename,
  processing_time_ms,
  num_students,
  num_incomplete_degree_students
) => {
  try {
    // Insert row
    const response = await DB.insert(
      tableNames.auditInfo,
      {
        initiating_user_pid,
        filename,
        processing_time_ms,
        num_students,
        num_incomplete_degree_students,
      },
      []
    );

    // If DB.insert returns insertId, use it
    if (response?.result.insertId) {
      return response.result.insertId;
    }

    return result?.length ? result[0].audit_id : null;
  } catch (err) {
    throw err;
  }
};

/**
 * Delete audit matching auditId
 */
module.exports.deleteAudit = (auditId) => {
  return DB.delete(tableNames.auditInfo, { audit_id: auditId });
};

module.exports.updateAuditStats = (
  auditId,
  processing_time_ms,
  num_students,
  num_incomplete_degree_students
) => {
  return DB.update(
    tableNames.auditInfo,
    { processing_time_ms, num_students, num_incomplete_degree_students },
    [], // no literals
    { audit_id: auditId } // primary key
  );
};


/**
 * Returns students and their missing classes for a given audit_id
 */
module.exports.getAuditResults = (auditId) => {
  const query = `
        SELECT sp.id, sp.name, sp.standing_message, sp.admit_term, sp.current_term,
               sp.concentration, sp.advisor_lname, sp.overall_hours_attempted,
               sp.overall_gpa, sp.transfer_hours_earned, sp.in_major_gpa,
               asp.email, asp.completion_term_code, asp.graduation_ready,
               asp.missing_courses, asp.citizen_code, asp.transfer_flag, 
               asp.cadet_flag, asp.student_class_desc, asp.self_reported_veteran_flag
        FROM ${tableNames.studentProgress} sp
        LEFT JOIN ${tableNames.additionalProgress} asp
        ON sp.id = asp.student_id AND asp.audit_id = sp.audit_id
        WHERE sp.audit_id = ?;
    `;
  return DB.query(query, [auditId]).then(({ result }) => result);
};

/**
 * Returns audit data formatted for Excel export (PTD only; no P91)
 */
// In AuditInfo.js

module.exports.getAuditAsExcelData = async (auditId) => {
  // 1. Raw rows from DB (Student_Progress + Additional_Student_Progress_Info)
  const results = await module.exports.getAuditResults(auditId);

  if (!results || results.length === 0) {
    return { sheets: {} };
  }

  // 2. Clean & shape rows specifically for Excel
  const students = results.map((r) => {
    // --- missing_courses: JSON → "msg1; msg2; ..." ---
    let missing = r.missing_courses;
    let missingText = "";

    if (Array.isArray(missing)) {
      // Already parsed (unlikely on this path, but safe)
      missingText = missing.join("; ");
    } else if (typeof missing === "string" && missing.trim() !== "") {
      // Try to parse JSON text
      try {
        const parsed = JSON.parse(missing);
        if (Array.isArray(parsed)) {
          missingText = parsed.join("; ");
        } else {
          // Not an array, just keep the raw string
          missingText = missing;
        }
      } catch (e) {
        // Not valid JSON, just use the string as-is
        missingText = missing;
      }
    }

    return {
      ...r,
      // Replace / override with a human-readable column
      missing_courses: missingText,

      // Normalize booleans so Excel sees TRUE / FALSE
      graduation_ready:
        r?.graduation_ready === 1 || r?.graduation_ready === true,
      transfer_flag:
        r?.transfer_flag === 1 || r?.transfer_flag === true,
      cadet_flag:
        r?.cadet_flag === 1 || r?.cadet_flag === true,
      self_reported_veteran_flag:
        r?.self_reported_veteran_flag === 1 ||
        r?.self_reported_veteran_flag === true,
    };
  });

  // 3. Build sheet map: "Full Analysis" + per-advisor sheets
  const xlsxRows = {};
  xlsxRows["Full Analysis"] = students;

  const grouped = students.reduce((acc, s) => {
    const key = s.advisor_lname || "Unknown Advisor";
    (acc[key] ||= []).push(s);
    return acc;
  }, {});

  for (const [advisor, list] of Object.entries(grouped)) {
    xlsxRows[advisor] = list;
  }

  return { sheets: xlsxRows };
};


/**
 * Get generated audit file path if stored in DB (optional, depends on design)
 * If you're storing the generated Excel file path, adapt this to your schema.
 */
module.exports.getAuditFilePath = (auditId) => {
  const query = `
        SELECT generated_filepath
        FROM ${tableNames.auditInfo}
        WHERE audit_id = ?;
    `;
  return DB.query(query, [auditId]).then(({ result }) => {
    if (result?.length === 1) {
      return result[0].generated_filepath;
    }
    return null;
  });
};

/** Returns one row from Audit_Info by audit_id (or null). */
module.exports.getAuditInfoById = (auditId) => {
  const sql = `SELECT * FROM Audit_Info WHERE audit_id = ? LIMIT 1`;
  return DB.query(sql, [auditId]).then(({ result }) => result[0] || null);
};

/** Counts DISTINCT students written so far for this audit. */
module.exports.countProcessedStudents = (auditId) => {
  const sql = `SELECT COUNT(DISTINCT id) AS n FROM Student_Progress WHERE audit_id = ?`;
  return DB.query(sql, [auditId]).then(({ result }) => Number(result[0]?.n || 0));
};

