const { getAllStudents, getStudentByID, getAllAdvisorLNames, getStudentsByAdvisor } = require("../../database/utils/Student");
const { getCoursesByStudentID } = require("../../database/utils/Course");
const Log = require("../../database/utils/Log");
const { getCurrentUser } = require("../helpers");
const { DB, tableNames, } = require("../../database/handler");
const { arrayFrom, listToStr } = require("../../helpers/objectManipulation");

exports.findAll = async (req, res) => {
    const { limit, offset, advisorLNames, searchInput, flaggedOnly } = req.query;

    const applyPagination = (studentsList) => {
        const paginatedList = studentsList.slice(parseInt(offset), parseInt(offset) + parseInt(limit));
        return paginatedList;
    };

    try {
        Log.info(`Received request to get paginated students with limit: ${limit}, offset: ${offset}.`, getCurrentUser(res)?.pid);

        let studentsPromise;

        if (searchInput || advisorLNames) {
            let match = '';
            const id = parseInt(searchInput);
            match = isNaN(id) ? `%${searchInput}%` : id;

            const advisorNames = advisorLNames ? advisorLNames.split(",") : [];
            const advisorFilter = advisorNames.length > 0 ? `Student.advisor_lname IN (${advisorNames.map(name => `'${name}'`).join(",")})` : "1";

            let filter = '';

            // Declare searchable column names for the student table
            const studentColNames = [
                'id', 'name', 'admit_term', 'advisor_lname', 'overall_gpa',
                'in_major_gpa'
            ];

            let studentColsStr = studentColNames.map(x => x = `${tableNames.student}.${x}`).join(", ");

            const addColNames = [
                'completion_term_code', 'email', 'missing_courses'
            ];

           let addColsStr = addColNames.map(x => x = `${tableNames.additional}.${x}`).join(", ");

           //Handle hasViolations column and flaggedOnly
            if (flaggedOnly === 'true') {
                filter += ` INNER`
            } else {
                filter += ` LEFT OUTER`;
            }
            filter += ` JOIN (`+
                `SELECT student_id, COUNT(type) AS violations `+
                `FROM \`${tableNames.violation}\` `+
                `GROUP BY student_id`+
            `) AS Violations ON \`${tableNames.student}\`.id=\`Violations\`.student_id`;

            const violationColStr = `violations IS NOT NULL AS hasViolation`

            const placeholderStr = listToStr(studentColNames.map(x => x = `${tableNames.student}.${x}`), ' OR ', '%s LIKE ?');

            const studentQuery = `SELECT DISTINCT ${studentColsStr}, ${addColsStr}, ${violationColStr} FROM \`${tableNames.student}\``
                +` LEFT OUTER JOIN ${tableNames.additional} ON \`${tableNames.student}\`.id=\`${tableNames.additional}\`.student_id`

            const query = studentQuery + filter
                + ` WHERE ${advisorFilter} AND (${placeholderStr}) ORDER BY name ASC`;

            console.log(query);

            const searchResult = await DB.query(
                query,
                arrayFrom(match, studentColNames.length)
            );

            //console.log(searchResult.result);

            studentsPromise = Promise.resolve(searchResult.result);

        } else {

            // Declare searchable column names for the student table
            const studentColNames = [
                'id', 'name', 'admit_term', 'advisor_lname', 'overall_gpa',
                'in_major_gpa'
            ];

            let studentColsStr = studentColNames.map(x => x = `${tableNames.student}.${x}`).join(", ");

            const addColNames = [
                'completion_term_code', 'email', 'missing_courses'
            ];

            let addColsStr = addColNames.map(x => x = `${tableNames.additional}.${x}`).join(", ");

            const studentQuery = `SELECT ${studentColsStr}, ${addColsStr} FROM \`${tableNames.student}\``
                +` INNER JOIN ${tableNames.additional} ON \`${tableNames.student}\`.id=\`${tableNames.additional}\`.student_id`

            const searchResult = await DB.query(
                studentQuery
            );

            studentsPromise = Promise.resolve(searchResult.result);
        }

        studentsPromise
            .then((students) => {
                const paginatedStudents = applyPagination(students);
                const totalStudents = students.length;
                Log.info(`Successfully got paginated students.`, getCurrentUser(res)?.pid);
                res.status(200).send({ students: paginatedStudents, total: totalStudents });
            })
            .catch((err) => {
                Log.error('Error getting paginated students:', getCurrentUser(res)?.pid, err);
                res.status(500).send({
                    message: err.message || "Some error occurred while retrieving paginated students."
                });
            });
    } catch (err) {
        Log.error('Error processing request to retrieve students:', getCurrentUser(res)?.pid, err);
        res.status(500).send({
            message: err.message || "Some error occurred while processing the request."
        });
    }
};



// Find a single Student with a studentID
exports.findOne = async (req, res) => {
    Log.info(`Received request to get single student of ID: ${req.params.studentID}.`, getCurrentUser(res)?.pid);

    // Declare searchable column names for the student table
    const studentColNames = [
        'id', 'name', 'admit_term', 'advisor_lname', 'overall_gpa', 'concentration',
        'in_major_gpa', 'overall_hours_attempted', 'transfer_hours_earned', 
        'standing_message', 'current_term'
    ];

    let studentColsStr = studentColNames.map(x => x = `${tableNames.student}.${x}`).join(", ");

    const addColNames = [
        'completion_term_code', 'email', 'missing_courses'
    ];

    let addColsStr = addColNames.map(x => x = `${tableNames.additional}.${x}`).join(", ");

    const studentQuery = `SELECT ${studentColsStr}, ${addColsStr} FROM \`${tableNames.student}\``
        +` INNER JOIN ${tableNames.additional} ON \`${tableNames.student}\`.id=\`${tableNames.additional}\`.student_id`
        +` WHERE \`${tableNames.student}\`.id=${req.params.studentID}`

    const searchResult = await DB.query(
        studentQuery
    );

    res.status(200).send({student: searchResult.result[0]})

};

// Retrieve and return all courses for a Student from the database.
exports.findCourses = (req, res) => {
    Log.info(`Received request to get courses for student with ID: ${req.params.studentID}.`, getCurrentUser(res)?.pid);
    getCoursesByStudentID(req.params.studentID, true).then((courses) => {
        Log.info(`Successfully got courses for student with ID ${req.params.studentID}.`, getCurrentUser(res)?.pid);
        res.status(200).send({ courses: courses });
    }).catch((err) => {
        Log.error(`Error getting courses for student with ID ${req.params.studentID}:`, getCurrentUser(res)?.pid, err);
        res.status(500).send({
            message: err.message || "Some error occurred while retrieving courses for the student."
        });
    });
};


exports.getAdvisor = (req, res) => {
    Log.info(`Received request to get all advisors.`, getCurrentUser(res)?.pid);

    getAllAdvisorLNames()
        .then((advisors) => {
            Log.info(`Successfully got all advisors.`, getCurrentUser(res)?.pid);
            res.status(200).send({ advisors: advisors });
        })
        .catch((err) => {
            Log.error('Error getting advisors:', getCurrentUser(res)?.pid, err);
            res.status(500).send({
                message: err.message || "Some error occurred while retrieving advisors."
            });
        });
};
