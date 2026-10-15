const Log = require("../../database/utils/Log");
const { getAllViolations, getViolationByID, getViolationsByStudentID, getAllViolationMessages } = require("../../database/utils/Violation");
const { getCurrentUser } = require("../helpers");
const { getViolationCoursesByViolationID } = require("../../database/utils/ViolationCourse");
const { getViolationMessage, getViolationWarningMessage } = require("../../database/utils/ViolationType");


exports.findAll = (req, res) => {
    Log.info(`Received request to get all violations.`, getCurrentUser(res)?.pid);
    getAllViolations().then((violations) => {
        Log.info(`Successfully got all violations.`, getCurrentUser(res)?.pid);
        res.status(200).send({ violations: violations });
    }).catch((err) => {
        Log.error('Error getting all violations:', getCurrentUser(res)?.pid, err);
        res.status(500).send({
            message: err.message || "Some error occurred while retrieving violations."
        });
    });
};


// Find a single Violation with a violationId
exports.findOne = (req, res) => {
    Log.info(`Received request to get single violation of ID: ${req.params.violationId}.`, getCurrentUser(res)?.pid);
    getViolationByID(req.params.violationId).then((violation) => {
        if (!violation) {
            Log.info(`Violation of ID ${req.params.violationId} not found.`, getCurrentUser(res)?.pid);
            return res.status(404).send({
                message: "Violation not found with id " + req.params.violationId
            });
        }
        Log.info(`Successfully got single violation of ID ${req.params.violationId}: ${violation}.`, getCurrentUser(res)?.pid);
        res.status(200).send({ violation: violation });
    }).catch((err) => {
        Log.error(`Error getting single violation of ID ${req.params.violationId}:`, getCurrentUser(res)?.pid, err);
        if (err.kind === 'ObjectId') {
            return res.status(404).send({
                message: "Violation not found with id " + req.params.violationId
            });
        }
        return res.status(500).send({
            message: "Error retrieving violation with id " + req.params.violationId
        });
    });
};

// Find all violations for a student with a studentId
exports.findByStudentId = async (req, res) => {
    try {
        const getViolationDetails = (violations) => new Promise(async (resolve, reject) => {
            let violationMessages;
            try {
                violationMessages = await getAllViolationMessages();
            } catch (err) {
                return reject(new Error(`Error getting violation message list: ${err}`));
            }

            for (let i in violations) {
                const violation = violations[i];

                try {
                    // Get violation courses
                    const violationCourses = await getViolationCoursesByViolationID(violation.id);

                    violations[i] = {
                        id: violation.id,
                        student_id: req.params.studentId,
                        type: violation.type,
                        is_warning: violation.isWarning,
                        associatedCourses: violationCourses.map(course => {
                            return {
                                subj_expanded: course.subjExpanded,
                                course_number: course.courseNumber,
                                term_taken: course.termTaken,
                                credit_hours: course.creditHours,
                                grade: course.grade
                            };
                        }),
                        message: violationMessages[violation.type][violation.isWarning ? 'warningMessage' : 'message']
                    };
                } catch (err) {
                    return reject(new Error(`Error getting violation details for violation of ID ${violation.id}: ${err}`));
                }
            }

            return resolve(violations);
        });

        Log.info(`Received request to get violations for student with ID: ${req.params.studentId}.`, getCurrentUser(res)?.pid);

        const violations = await getViolationsByStudentID(req.params.studentId);

        if (violations.length === 0) {
            Log.info(`No violations found for student with ID ${req.params.studentId}.`, getCurrentUser(res)?.pid);
            res.status(200).send({ violations: [] });
        } else {
            // Fetch details for each violation
            getViolationDetails(violations).then((violationsWithDetails) => {
                Log.info(`Successfully got violations for student with ID ${req.params.studentId}.`, getCurrentUser(res)?.pid);
                res.status(200).send({ violations: violationsWithDetails });
            }).catch((err) => {
                Log.error(`Error getting violation details:`, getCurrentUser(res)?.pid, err);
                res.status(500).send({
                    message: "Some error occurred while getting the violations for the student.",
                });
            })
        }
    } catch (err) {
        Log.error(`Error getting violations for student of ID ${req.params.studentId}:`, getCurrentUser(res)?.pid, err);
        res.status(500).send({
            message: "Some error occurred while getting the violations for the student.",
        });
    }
};
