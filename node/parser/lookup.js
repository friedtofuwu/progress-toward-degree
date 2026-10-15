const FLAG_LOW_GPA = 1;
const FLAG_MISSING_REQUIRED_COURSE = 2;
const FLAG_THREE_REPEATS = 3;
const FLAG_FOUR_TOTAL_REPEATS = 4;

const validGrades = [
    'P', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'F',
    'F *', 'AUD', 'EQ', 'I', 'CC', 'CE', 'CN', 'NG', 'NR', 'NS', 'S', 'T', 'W',
    'WG', 'RP', ''
];
const passingGrades = [
    'P', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'CC', 'T'
];
const passingGradesRequired = [
    'P', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'CC', 'T'
];
const repeatableGrades = ['T'];

// Hashmap for in-major grades and their grade points
const inMajorGradePoints = {
    'A': 4.0,
    'A-': 3.7,
    'B+': 3.3,
    'B': 3.0,
    'B-': 2.7,
    'C+': 2.3,
    'C': 2.0,
    'C-': 1.7,
    'D+': 1.3,
    'D': 1.0,
    'D-': 0.7,
    'F': 0.0,
    'F *': 0.0,
    '': 0.0
};

const major = 'CS';

const exportHeaders = [
    { header: 'Student ID', key: 'id' }, 
    { header: 'Student Name', key: 'name' }, 
    { header: 'Email', key: 'email' }, 
    { header: 'Admit Term', key: 'admit_term'}, 
    { header: 'Completion Term', key: 'completion_term_code' }, 
    { header: 'Advisor Last Name', key: 'advisor_lname' },
    { header: 'Standing Message', key: 'standing_message' }, 
    { header: 'Concentration', key: 'concentration' }, 
    { header: 'Overall GPA', key: 'overall_gpa' }, 
    { header: 'In-Major GPA', key: 'in_major_gpa' }, 
    { header: 'Overall Hours Attempted', key: 'overall_hours_attempted' },
    { header: 'Transfer Hours Earned', key: 'transfer_hours_earned' }, 
    { header: 'Subject Expanded', key: 'subj_expanded' }, 
    { header: 'Course Number', key: 'course_number' },
    { header: 'Term Taken', key:'term_taken' }, 
    { header: 'Credit Hours', key: 'credit_hours' },
    { header: 'Grade', key: 'grade'}, 
    { header: 'Missing Courses', key: 'missing_courses' }, 
    { header: 'Flag Messages', key: 'message' }
];

function maxGrade(grade1, grade2) {
    // Lower index in validGrades -> higher grade
    const grade1Index = validGrades.indexOf(grade1);
    const grade2Index = validGrades.indexOf(grade2);

    // Catch invalid grades, return the one that is valid or, if they are both
    // invalid, return either of them (will return grade2)
    if (grade1Index < 0) return grade2;
    if (grade2Index < 0) return grade1;

    return grade1Index <= grade2Index ? grade1 : grade2;
}

function listContainsCourse(courseList, subjExpanded, courseNumber) {
    return courseList[subjExpanded]?.includes(courseNumber) || false;
}

function addToCourseList(courseList, subjExpanded, courseNumber) {
    if (courseList[subjExpanded]) {
        if (!courseList[subjExpanded].includes(courseNumber)) {
            // This course has not been encountered yet
            courseList[subjExpanded].push(courseNumber);
        }
    } else {
        // A course of this subject has not been encountered yet
        courseList[subjExpanded] = [courseNumber];
    }

    return courseList;
}

function coursePassed(grade) {
    return passingGrades.includes(grade);
}

function requiredCoursePassed(grade) {
    return passingGradesRequired.includes(grade);
}

function getAcademicYear(admitTerm) {
    const year = Math.floor(admitTerm / 100);
    const term = admitTerm % 100;

    // If the term is from September (09) to August (08) of the next year, it belongs to the previous academic year.
    if (term >= 9) {
        return year;
    } else {
        return year - 1;
    }
}

function isRegularSemester(admitTerm) {
    const term = admitTerm % 100;
    return term === 9 || term === 1;
}

module.exports = {
    FLAG_LOW_GPA,
    FLAG_MISSING_REQUIRED_COURSE,
    FLAG_THREE_REPEATS,
    FLAG_FOUR_TOTAL_REPEATS,
    validGrades,
    passingGrades,
    passingGradesRequired,
    repeatableGrades,
    inMajorGradePoints,
    major,
    exportHeaders,
    maxGrade,
    listContainsCourse,
    addToCourseList,
    coursePassed,
    requiredCoursePassed,
    getAcademicYear,
    isRegularSemester
}
