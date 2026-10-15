require("jest");
const fs = require("fs");

const {
    analyzeStudents,
    convertStudentsToData
} = require("../parser/parser.js");
const {
    outputToExcel,
    readExcelFile
} = require("../parser/spreadsheet.js");
const {
    defaultSpecial,
    defaultRepeatable,
    defaultRequired
} = require("./testCourseLists.js");
const { FLAG_LOW_GPA, FLAG_FOUR_TOTAL_REPEATS, FLAG_THREE_REPEATS, FLAG_MISSING_REQUIRED_COURSE } = require("../parser/lookup.js");

function checkFloatsEqual(float1, float2) {
    expect(Math.abs(float1 - float2)).toBeLessThanOrEqual(0.001);
}

//test one case at a time
jest.setTimeout(30000);

describe("Test case when student retakes 4 cs course in total", () => {
    let uploadedFilePath = `${__dirname}/import-examples/totalRetakes4.xlsx`;
    let students, results, warnings;

    beforeAll(async () => {
        await new Promise((resolve) => {
            students = readExcelFile(uploadedFilePath);

            analyzeStudents(students, defaultRequired, defaultRepeatable, defaultSpecial)
                .then(({ result: res, warnings: warn }) => {
                    results = res;
                    warnings = warn;
                }).catch(({ errMsg }) => {
                    throw new Error(errMsg);
                }).finally(() => resolve());
        })
    });

    test("read students object from Excel file", () => {
        expect(typeof students).toBe("object");
        expect(Object.keys(students).length).toBe(2);

        const student1 = results['905000001'];
        expect(student1.name).toBe('Student 1');
        expect(student1.standingMessage).toBe('Spring 2023:  Good Standing');
        expect(student1.admitTerm).toBe(202209);
        expect(student1.currentTerm).toBe(202306);
        expect(student1.concentration).toBe('CS');
        expect(student1.advisorLName).toBe('Parker');
        expect(student1.overallHoursAttempted).toBe(32);
        expect(student1.overallGPA).toBe(3.16);
        expect(student1.transferHoursEarned).toBe(78);
        checkFloatsEqual(student1.inMajorGPA, 2.71);
        expect(student1.spreadsheetIndex).toBe(2);
        expect(student1.courses.length).toBe(48);

        const student2 = results['905000002'];
        expect(student2.name).toBe('Student 2');
        expect(student2.standingMessage).toBe('Spring 2023:  Good Standing');
        expect(student2.admitTerm).toBe(202209);
        expect(student2.currentTerm).toBe(202301);
        expect(student2.concentration).toBe('CS');
        expect(student2.advisorLName).toBe('Parker');
        expect(student2.overallHoursAttempted).toBe(31);
        expect(student2.overallGPA).toBe(3.622580645);
        expect(student2.transferHoursEarned).toBe(3);
        checkFloatsEqual(student2.inMajorGPA, 4.0);
        expect(student2.spreadsheetIndex).toBe(50);
        expect(student2.courses.length).toBe(12);

        expect(warnings.length).toBe(0);
    });

    test("check flag counts", () => {
        expect(results['905000001'].flags.length).toBe(1);
        expect(results['905000002'].flags.length).toBe(0);
    });

    test("first student flagged for 4 course repeats", () => {
        const studentFlag = results['905000001'].flags[0] || null;
        expect(studentFlag).not.toBeNull();

        expect(studentFlag.type).toBe(FLAG_FOUR_TOTAL_REPEATS);
        expect(studentFlag.isWarning).toBe(false);

        const assocCourses = studentFlag.associatedCourses
        expect(assocCourses.length).toBe(4);
        expect(assocCourses[0].subjExpanded).toBe('CS');
        expect(assocCourses[0].courseNumber).toBe('1114');
        expect(assocCourses[0].termTaken).toBe(202209);
        expect(assocCourses[1].subjExpanded).toBe('CS');
        expect(assocCourses[1].courseNumber).toBe('2114');
        expect(assocCourses[1].termTaken).toBe(202208);
        expect(assocCourses[2].subjExpanded).toBe('CS');
        expect(assocCourses[2].courseNumber).toBe('3114');
        expect(assocCourses[2].termTaken).toBe(202301);
        expect(assocCourses[3].subjExpanded).toBe('CS');
        expect(assocCourses[3].courseNumber).toBe('2104');
        expect(assocCourses[3].termTaken).toBe(202301);
    });
});

describe("Test case when student has an in-major GPA < 2.0 + indiv repeat warning", () => {
    let uploadedFilePath = `${__dirname}/import-examples/under2gpa.xlsx`;
    let students, results, warnings;

    beforeAll(async () => {
        await new Promise((resolve) => {
            students = readExcelFile(uploadedFilePath);

            analyzeStudents(students, defaultRequired, defaultRepeatable, defaultSpecial)
                .then(({ result: res, warnings: warn }) => {
                    results = res;
                    warnings = warn;
                }).catch(({ errMsg }) => {
                    throw new Error(errMsg);
                }).finally(() => resolve());
        })
    });

    test("read students object from Excel file", () => {
        expect(typeof students).toBe("object");
        expect(Object.keys(students).length).toBe(2);

        const student1 = results['905000001'];
        expect(student1.name).toBe('Student 1');
        expect(student1.standingMessage).toBe('Spring 2023:  Good Standing');
        expect(student1.admitTerm).toBe(202209);
        expect(student1.currentTerm).toBe(202306);
        expect(student1.concentration).toBe('CS');
        expect(student1.advisorLName).toBe('Parker');
        expect(student1.overallHoursAttempted).toBe(32);
        expect(student1.overallGPA).toBe(3.16);
        expect(student1.transferHoursEarned).toBe(78);
        checkFloatsEqual(student1.inMajorGPA, 1.68);
        expect(student1.spreadsheetIndex).toBe(2);
        expect(student1.courses.length).toBe(48);

        const student2 = results['905000002'];
        expect(student2.name).toBe('Student 2');
        expect(student2.standingMessage).toBe('Spring 2023:  Good Standing');
        expect(student2.admitTerm).toBe(202209);
        expect(student2.currentTerm).toBe(202301);
        expect(student2.concentration).toBe('CS');
        expect(student2.advisorLName).toBe('Parker');
        expect(student2.overallHoursAttempted).toBe(31);
        expect(student2.overallGPA).toBe(3.622580645);
        expect(student2.transferHoursEarned).toBe(3);
        checkFloatsEqual(student2.inMajorGPA, 4.0);
        expect(student2.spreadsheetIndex).toBe(47);
        expect(student2.courses.length).toBe(12);

        expect(warnings.length).toBe(0);
    });

    test("check flag counts", () => {
        expect(results['905000001'].flags.length).toBe(2);
        expect(results['905000002'].flags.length).toBe(0);
    });

    test("first student flagged for < 2.0 in-major GPA", () => {
        const studentFlag = results['905000001'].flags[0] || null;
        expect(studentFlag).not.toBeNull();

        expect(studentFlag.type).toBe(FLAG_LOW_GPA);
        expect(studentFlag.isWarning).toBe(false);

        expect(studentFlag.associatedCourses.length).toBe(0);
    });

    test("first student flagged (warning) for needing a third repeat of required CS course", () => {
        const studentFlag = results['905000001'].flags[1] || null;
        expect(studentFlag).not.toBeNull();

        expect(studentFlag.type).toBe(FLAG_THREE_REPEATS);
        expect(studentFlag.isWarning).toBe(true);

        expect(studentFlag.associatedCourses.length).toBe(1);
        expect(studentFlag.associatedCourses[0].subjExpanded).toBe('CS');
        expect(studentFlag.associatedCourses[0].courseNumber).toBe('1114');
        expect(studentFlag.associatedCourses[0].termTaken).toBe(202209);
    });
});

describe("Test case when CS course has unrecognized grade", () => {
    let uploadedFilePath = `${__dirname}/import-examples/unrecognizedGrade.xlsx`;
    let students, results, warnings;

    beforeAll(async () => {
        await new Promise((resolve) => {
            students = readExcelFile(uploadedFilePath);

            analyzeStudents(students, defaultRequired, defaultRepeatable, defaultSpecial)
                .then(({ result: res, warnings: warn }) => {
                    results = res;
                    warnings = warn;
                }).catch(({ errMsg }) => {
                    throw new Error(errMsg);
                }).finally(() => resolve());
        })
    });

    test("read students object from Excel file", () => {
        expect(typeof students).toBe("object");
        expect(Object.keys(students).length).toBe(2);

        const student1 = results['905000001'];
        expect(student1.name).toBe('Student 1');
        expect(student1.standingMessage).toBe('Spring 2023:  Good Standing');
        expect(student1.admitTerm).toBe(202209);
        expect(student1.currentTerm).toBe(202306);
        expect(student1.concentration).toBe('CS');
        expect(student1.advisorLName).toBe('Parker');
        expect(student1.overallHoursAttempted).toBe(32);
        expect(student1.overallGPA).toBe(3.16);
        expect(student1.transferHoursEarned).toBe(78);
        checkFloatsEqual(student1.inMajorGPA, 1.85);
        expect(student1.spreadsheetIndex).toBe(2);
        expect(student1.courses.length).toBe(48);

        const student2 = results['905000002'];
        expect(student2.name).toBe('Student 2');
        expect(student2.standingMessage).toBe('Spring 2023:  Good Standing');
        expect(student2.admitTerm).toBe(202209);
        expect(student2.currentTerm).toBe(202301);
        expect(student2.concentration).toBe('CS');
        expect(student2.advisorLName).toBe('Parker');
        expect(student2.overallHoursAttempted).toBe(31);
        expect(student2.overallGPA).toBe(3.622580645);
        expect(student2.transferHoursEarned).toBe(3);
        checkFloatsEqual(student2.inMajorGPA, 4.0);
        expect(student2.spreadsheetIndex).toBe(47);
        expect(student2.courses.length).toBe(12);

        expect(warnings.length).toBe(1);
        expect(/unrecognized grade/i.test(warnings[0])).toBe(true);
    });

    test("check flag counts", () => {
        expect(results['905000001'].flags.length).toBe(2);
        expect(results['905000002'].flags.length).toBe(0);
    });

    test("first student flagged for < 2.0 in-major GPA", () => {
        const studentFlag = results['905000001'].flags[0] || null;
        expect(studentFlag).not.toBeNull();

        expect(studentFlag.type).toBe(FLAG_LOW_GPA);
        expect(studentFlag.isWarning).toBe(false);

        expect(studentFlag.associatedCourses.length).toBe(0);
    });

    test("first student flagged (warning) for needing a third repeat of required CS course", () => {
        const studentFlag = results['905000001'].flags[1] || null;
        expect(studentFlag).not.toBeNull();

        expect(studentFlag.type).toBe(FLAG_THREE_REPEATS);
        expect(studentFlag.isWarning).toBe(true);

        expect(studentFlag.associatedCourses.length).toBe(1);
        expect(studentFlag.associatedCourses[0].subjExpanded).toBe('CS');
        expect(studentFlag.associatedCourses[0].courseNumber).toBe('1114');
        expect(studentFlag.associatedCourses[0].termTaken).toBe(202209);
    });
});

describe("Test case when student is missing a required CS course", () => {
    let uploadedFilePath = `${__dirname}/import-examples/notTakingCSClass.xlsx`;
    let students, results, warnings;

    beforeAll(async () => {
        await new Promise((resolve) => {
            students = readExcelFile(uploadedFilePath);

            analyzeStudents(students, defaultRequired, defaultRepeatable, defaultSpecial)
                .then(({ result: res, warnings: warn }) => {
                    results = res;
                    warnings = warn;
                }).catch(({ errMsg }) => {
                    throw new Error(errMsg);
                }).finally(() => resolve());
        })
    });

    test("read students object from Excel file", () => {
        expect(typeof students).toBe("object");
        expect(Object.keys(students).length).toBe(1);

        const student1 = results['905000001'];
        expect(student1.name).toBe('Student 1');
        expect(student1.standingMessage).toBe('Spring 2023:  Good Standing');
        expect(student1.admitTerm).toBe(202209);
        expect(student1.currentTerm).toBe(202301);
        expect(student1.concentration).toBe('DSS');
        expect(student1.advisorLName).toBe('Parker');
        expect(student1.overallHoursAttempted).toBe(32);
        expect(student1.overallGPA).toBe(3.16);
        expect(student1.transferHoursEarned).toBe(78);
        checkFloatsEqual(student1.inMajorGPA, 3.0);
        expect(student1.spreadsheetIndex).toBe(2);
        expect(student1.courses.length).toBe(30);

        expect(warnings.length).toBe(0);
    });

    test("check flag counts", () => {
        expect(results['905000001'].flags.length).toBe(1);
    });

    test("student flagged for missing required course for current (normal) semester", () => {
        const studentFlag = results['905000001'].flags[0] || null;
        expect(studentFlag).not.toBeNull();

        expect(studentFlag.type).toBe(FLAG_MISSING_REQUIRED_COURSE);
        expect(studentFlag.isWarning).toBe(false);
        expect(studentFlag.associatedCourses.length).toBe(0);
    });
});

describe("Test case when student repeated one class 3 times + warning on 2", () => {
    let uploadedFilePath = `${__dirname}/import-examples/sameRetakes3.xlsx`;
    let students, results, warnings;

    beforeAll(async () => {
        await new Promise((resolve) => {
            students = readExcelFile(uploadedFilePath);

            analyzeStudents(students, defaultRequired, defaultRepeatable, defaultSpecial)
                .then(({ result: res, warnings: warn }) => {
                    results = res;
                    warnings = warn;
                }).catch(({ errMsg }) => {
                    throw new Error(errMsg);
                }).finally(() => resolve());
        })
    });

    test("read students object from Excel file", () => {
        expect(typeof students).toBe("object");
        expect(Object.keys(students).length).toBe(2);

        const student1 = results['905000001'];
        expect(student1.name).toBe('Student 1');
        expect(student1.standingMessage).toBe('Spring 2023:  Good Standing');
        expect(student1.admitTerm).toBe(202209);
        expect(student1.currentTerm).toBe(202301);
        expect(student1.concentration).toBe('CS');
        expect(student1.advisorLName).toBe('Parker');
        expect(student1.overallHoursAttempted).toBe(32);
        expect(student1.overallGPA).toBe(3.16);
        expect(student1.transferHoursEarned).toBe(78);
        checkFloatsEqual(student1.inMajorGPA, 3.0);
        expect(student1.spreadsheetIndex).toBe(2);
        expect(student1.courses.length).toBe(47);

        const student2 = results['905000002'];
        expect(student2.name).toBe('Student 2');
        expect(student2.standingMessage).toBe('Spring 2023:  Good Standing');
        expect(student2.admitTerm).toBe(202201);
        expect(student2.currentTerm).toBe(202208);
        expect(student2.concentration).toBe('CS');
        expect(student2.advisorLName).toBe('Montgomery');
        expect(student2.overallHoursAttempted).toBe(31);
        expect(student2.overallGPA).toBe(3.622580645);
        expect(student2.transferHoursEarned).toBe(3);
        checkFloatsEqual(student2.inMajorGPA, 4.0);
        expect(student2.spreadsheetIndex).toBe(49);
        expect(student2.courses.length).toBe(12);

        expect(warnings.length).toBe(0);
    });

    test("check flag counts", () => {
        expect(results['905000001'].flags.length).toBe(2);
    });

    test("student flagged for repeating CS1114 3 times", () => {
        const studentFlag = results['905000001'].flags[0] || null;
        expect(studentFlag).not.toBeNull();

        expect(studentFlag.type).toBe(FLAG_THREE_REPEATS);
        expect(studentFlag.isWarning).toBe(false);
        expect(studentFlag.associatedCourses.length).toBe(1);
        expect(studentFlag.associatedCourses[0].subjExpanded).toBe('CS');
        expect(studentFlag.associatedCourses[0].courseNumber).toBe('1114');
        expect(studentFlag.associatedCourses[0].termTaken).toBe(202301);
    });

    test("student flagged (warning) for failing CS 2114 twice", () => {
        const studentFlag = results['905000001'].flags[1] || null;
        expect(studentFlag).not.toBeNull();

        expect(studentFlag.type).toBe(FLAG_THREE_REPEATS);
        expect(studentFlag.isWarning).toBe(true);
        expect(studentFlag.associatedCourses.length).toBe(1);
        expect(studentFlag.associatedCourses[0].subjExpanded).toBe('CS');
        expect(studentFlag.associatedCourses[0].courseNumber).toBe('2114');
        expect(studentFlag.associatedCourses[0].termTaken).toBe(202301);
    });
});
