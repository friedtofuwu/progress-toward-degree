const Log = require("../../database/utils/Log");
const { getAllTimetables, getAllTimetablesByTermCode, getAllActiveByTermCode, getAllActiveByClass, updateTimeTable, setClassState, setClassIgnore, getAllActiveClassesByTermCode, getAllActiveSectionsByTermCodeAndCourseId, getSectionsByTermCode } = require("../../database/utils/TimeTable.js");
const { getCurrentUser } = require("../helpers");

module.exports.getFullTimetable = (req, res) => {
    Log.info('Received request to get full timetable.', getCurrentUser(res)?.pid);
    getAllTimetables().then((result) => {
        Log.info('Suggessfully got full timetable.', getCurrentUser(res)?.pid);
        res.status(200).json({
            timetable: result.map((tt) => tt.toJSON())
        })
    }).catch((err) => {
        Log.error(`Error getting full timetable: ${JSON.stringify(err)}`, getCurrentUser(res)?.pid);
        res.status(500).send({
            message: "Some error occurred while getting full timetable.",
        });
    })
}

module.exports.getClasses = (req,res) => {
    Log.info('Received request to get active classes by termcode.', getCurrentUser(res)?.pid);
    if (!req.params.termcode) {
        Log.warn (`Error getting active classes by termcode: termcode is missing.`, getCurrentUser(res)?.pid);
        return res.status(400).send({
            message: "Must supply a termcode",
        });
    }
    const termcode = parseInt(req.params.termcode);
    console.log("TERMCODE:"+termcode);
    getAllActiveClassesByTermCode(termcode).then((result) => {
        Log.info('Suggessfully got active classes by termcode.', getCurrentUser(res)?.pid);
        res.status(200).json({
            classes: result
        })
    }).catch((err) => {
        Log.error(`Error getting active classes by termcode: ${JSON.stringify(err)}`, getCurrentUser(res)?.pid);
        res.status(500).send({
            message: "Some error occurred while getting active classes by termcode.",
        });
    })
}

module.exports.getClassSections = (req,res) => {
    Log.info('Received request to get active sections by termcode and course ID.', getCurrentUser(res)?.pid);
    if (!req.params.termcode) {
        Log.warn (`Error getting active sections by termcode and course ID: termcode is missing.`, getCurrentUser(res)?.pid);
        return res.status(400).send({
            message: "Must supply a termcode",
        });
    }
    if (!req.params.course_id) {
        Log.warn (`Error getting active sections by termcode and course ID: course ID is missing.`, getCurrentUser(res)?.pid);
        return res.status(400).send({
            message: "Must supply a course ID",
        });
    }
    const termcode = parseInt(req.params.termcode);
    const course_id = req.params.course_id;
    console.log("TERMCODE:"+termcode+" CLASS:"+course_id);
    getAllActiveSectionsByTermCodeAndCourseId(termcode, course_id).then((result) => {
        Log.info('Suggessfully got active sections by termcode and course ID.', getCurrentUser(res)?.pid);
        res.status(200).json({
            timetable: result.map((tt) => tt.toJSON())
        })
    }).catch((err) => {
        Log.error(`Error getting active sections by termcode and course ID: ${JSON.stringify(err)}`, getCurrentUser(res)?.pid);
        res.status(500).send({
            message: "Some error occurred while getting active sections by termcode and course ID.",
        });
    })
}

module.exports.getActiveTimetableByTermCode = (req, res) => {
    Log.info('Received request to get active sections by termcode.', getCurrentUser(res)?.pid);
    if (!req.params.termcode) {
        Log.warn (`Error getting active sections by termcode: termcode is missing.`, getCurrentUser(res)?.pid);
        return res.status(400).send({
            message: "Must supply a termcode",
        });
    }
    const termcode = parseInt(req.params.termcode);
    getAllActiveByTermCode(termcode).then((result) => {
        Log.info('Suggessfully got active sections by termcode.', getCurrentUser(res)?.pid);
        res.status(200).json({
            timetable: result.map((tt) => tt.toJSON())
        })
    }).catch((err) => {
        Log.error(`Error getting active timetable by termcode: ${JSON.stringify(err)}`, getCurrentUser(res)?.pid);
        res.status(500).send({
            message: "Some error occurred while getting active timetable by termcode.",
        });
    })
}

module.exports.setClassState = (req, res) => {
    Log.info(`Received request to set class state with req: '${JSON.stringify(req.body)}'.`, getCurrentUser(res)?.pid);
    //set Term ${req.params.termcode} CRN ${req.params.crn} to ${(req.params.active == 1) ? "active" : "inactive"}.
    // Validate request
    if (!req.body) {
        Log.warn(`Error setting class state: request body is empty.`, getCurrentUser(res)?.pid);
        return res.status(400).send({
            message: "Timetable content can not be empty",
        });
    } else if (!req.body.termcode) {
        Log.warn (`Error setting class state: termcode is missing.`, getCurrentUser(res)?.pid);
        return res.status(400).send({
            message: "Must supply a termcode",
        });
    } else if (!req.body.crn) {
        Log.warn (`Error setting class state: crn is missing.`, getCurrentUser(res)?.pid);
        return res.status(400).send({
            message: "Must supply a crn",
        });
    } else if (!("state" in req.body)) {
        Log.warn (`Error setting class state: state is missing.`, getCurrentUser(res)?.pid);
        return res.status(400).send({
            message: "Must supply state",
        });
    } 
    const state = parseInt(req.body.state);
    if (state < 0 || state > 1) {
        Log.warn (`Error setting class state: state was ${state} but must be either 1 or 0.`, getCurrentUser(res)?.pid);
        return res.status(400).send({
            message: `Sent state = ${state}, must be either 0 or 1`,
        });
    }
    
    // Set class state
    const termcode = parseInt(req.body.termcode);
    const crn = parseInt(req.body.crn);
    setClassState(termcode, crn, state)
    .then(() => {
        Log.info(
            `Set class with termcode:${termcode} and crn:${crn} to state:${state} (${(state==1) ? "Active":"Inactive"})`,
            getCurrentUser(res)?.pid
        );
        res.sendStatus(204);
    }).catch((error) => {
        Log.error(
            `Error setting class with termcode:${termcode} and crn:${crn} to state:${state} (${(state==1) ? "Active":"Inactive"})`,
            getCurrentUser(res)?.pid
        );
        res.status(500).send({
            message: `Some error occured while setting class state`
        })
    });
}

module.exports.setClassIgnore = (req, res) => {
    Log.info(`Received request to set class ignore with req: '${JSON.stringify(req.body)}'.`, getCurrentUser(res)?.pid);
    //set Term ${req.params.termcode} CRN ${req.params.crn} to ${(req.params.active == 1) ? "active" : "inactive"}.
    // Validate request
    if (!req.body) {
        Log.warn(`Error setting class ignore: request body is empty.`, getCurrentUser(res)?.pid);
        return res.status(400).send({
            message: "Timetable content can not be empty",
        });
    } else if (!req.body.termcode) {
        Log.warn (`Error setting class ignore: termcode is missing.`, getCurrentUser(res)?.pid);
        return res.status(400).send({
            message: "Must supply a termcode",
        });
    } else if (!req.body.crn) {
        Log.warn (`Error setting class ignore: crn is missing.`, getCurrentUser(res)?.pid);
        return res.status(400).send({
            message: "Must supply a crn",
        });
    } else if (!("ignore" in req.body)) {
        Log.warn (`Error setting class ignore: ignore is missing.`, getCurrentUser(res)?.pid);
        return res.status(400).send({
            message: "Must supply ignore",
        });
    } 
    const ignore = parseInt(req.body.ignore);
    if (ignore < 0 || ignore > 1) {
        Log.warn (`Error setting class ignore: ignore was ${ignore} but must be either 1 or 0.`, getCurrentUser(res)?.pid);
        return res.status(400).send({
            message: `Sent ignore = ${ignore}, must be either 0 or 1`,
        });
    }
    
    // Set class ignore
    const termcode = parseInt(req.body.termcode);
    const crn = parseInt(req.body.crn);
    setClassIgnore(termcode, crn, ignore)
    .then(() => {
        Log.info(
            `Set class with termcode:${termcode} and crn:${crn} to ignore:${ignore} (${(ignore==1) ? "Active":"Inactive"})`,
            getCurrentUser(res)?.pid
        );
        res.sendStatus(204);
    }).catch((error) => {
        Log.error(
            `Error setting class with termcode:${termcode} and crn:${crn} to ignore:${ignore} (${(ignore==1) ? "Active":"Inactive"})`,
            getCurrentUser(res)?.pid
        );
        res.status(500).send({
            message: `Some error occured while setting class ignore`
        })
    });
}

module.exports.getSectionsByTerm = (req, res) => {
    Log.info('Received request to get sections by termcode.', getCurrentUser(res)?.pid);
    if (!req.params.termcode) {
        Log.warn (`Error getting sections by termcode: termcode is missing.`, getCurrentUser(res)?.pid);
        return res.status(400).send({
            message: "Must supply a termcode",
        });
    }
    const termcode = parseInt(req.params.termcode);
    getSectionsByTermCode(termcode).then((result) => {
        Log.info('Suggessfully got sections by termcode.', getCurrentUser(res)?.pid);
        res.status(200).json({
            sections: result.map((tt) => tt.toJSON())
        })
    }).catch((err) => {
        Log.error(`Error getting sections by termcode: ${JSON.stringify(err)}`, getCurrentUser(res)?.pid);
        res.status(500).send({
            message: "Some error occurred while getting sections by termcode.",
        });
    })
}


module.exports.updateTimeTable = (req, res) => {
    //Check request for some API Key
    //Check when the last time it was called to ensure not pulling too often
    //Update the timetable if all conditions met
    updateTimeTable().then((result) => {
        Log.info('Successfully update timetable',getCurrentUser(res)?.pid);
        res.status(200).json({text:"timetable updated"});
    }).catch((err) => {
        console.log("OOPSIE");
        Log.error(`Error updating the timetable: ${JSON.stringify(err)}`, getCurrentUser(res)?.pid);
        res.status(500).send({message: "Error updating timetable"});
    })
}