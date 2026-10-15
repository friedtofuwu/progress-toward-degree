const Log = require("../../database/utils/Log.js");
const { getAllGrad_Timetables, getAllGrad_TimetablesByTermCode, getAllActiveGrad_TimetablesByTermCode, getAllActiveByClass, updateGradTimeTable, setGrad_ClassState, setGrad_ClassIgnore, getAllActiveGrad_ClassesByTermCode, getAllActiveGrad_SectionsByTermCodeAndCourseId, getGrad_SectionsByTermCode } = require("../../database/utils/Grad_TimeTable.js");
const { getCurrentUser } = require("../helpers.js");

module.exports.getFullGrad_Timetable = (req, res) => {
    Log.info('Received request to get full grad timetable.', getCurrentUser(res)?.pid);
    getAllGrad_Timetables().then((result) => {
        Log.info('Successfully got full grad timetable.', getCurrentUser(res)?.pid);
        res.status(200).json({
            timetable: result.map((tt) => tt.toJSON())
        })
    }).catch((err) => {
        Log.error(`Error getting full grad timetable: ${JSON.stringify(err)}`, getCurrentUser(res)?.pid);
        res.status(500).send({
            message: "Some error occurred while getting full grad timetable.",
        });
    })
}

module.exports.getGrad_Classes = (req,res) => {
    Log.info('Received request to get active grad classes by termcode.', getCurrentUser(res)?.pid);
    if (!req.params.termcode) {
        Log.warn (`Error getting active grad classes by termcode: termcode is missing.`, getCurrentUser(res)?.pid);
        return res.status(400).send({
            message: "Must supply a termcode",
        });
    }
    const termcode = parseInt(req.params.termcode);
    console.log("TERMCODE:"+termcode);
    getAllActiveGrad_ClassesByTermCode(termcode).then((result) => {
        Log.info('Successfully got active grad classes by termcode.', getCurrentUser(res)?.pid);
        res.status(200).json({
            classes: result
        })
    }).catch((err) => {
        Log.error(`Error getting active grad classes by termcode: ${JSON.stringify(err)}`, getCurrentUser(res)?.pid);
        res.status(500).send({
            message: "Some error occurred while getting active grad classes by termcode.",
        });
    })
}

module.exports.getGrad_ClassSections = (req,res) => {
    Log.info('Received request to get active grad sections by termcode and course ID.', getCurrentUser(res)?.pid);
    if (!req.params.termcode) {
        Log.warn (`Error getting active grad sections by termcode and course ID: termcode is missing.`, getCurrentUser(res)?.pid);
        return res.status(400).send({
            message: "Must supply a termcode",
        });
    }
    if (!req.params.course_id) {
        Log.warn (`Error getting active grad sections by termcode and course ID: course ID is missing.`, getCurrentUser(res)?.pid);
        return res.status(400).send({
            message: "Must supply a course ID",
        });
    }
    const termcode = parseInt(req.params.termcode);
    const course_id = req.params.course_id;
    console.log("TERMCODE:"+termcode+" CLASS:"+course_id);
    getAllActiveGrad_SectionsByTermCodeAndCourseId(termcode, course_id).then((result) => {
        Log.info('Successfully got active grad sections by termcode and course ID.', getCurrentUser(res)?.pid);
        res.status(200).json({
            timetable: result.map((tt) => tt.toJSON())
        })
    }).catch((err) => {
        Log.error(`Error getting active grad sections by termcode and course ID: ${JSON.stringify(err)}`, getCurrentUser(res)?.pid);
        res.status(500).send({
            message: "Some error occurred while getting active grad sections by termcode and course ID.",
        });
    })
}

module.exports.getActiveGrad_TimetableByTermCode = (req, res) => {
    Log.info('Received request to get active grad timetable by termcode.', getCurrentUser(res)?.pid);
    if (!req.params.termcode) {
        Log.warn (`Error getting active grad timetable by termcode: termcode is missing.`, getCurrentUser(res)?.pid);
        return res.status(400).send({
            message: "Must supply a termcode",
        });
    }
    const termcode = parseInt(req.params.termcode);
    getAllActiveGrad_TimetablesByTermCode(termcode).then((result) => {
        Log.info('Successfully got active grad timetable by termcode.', getCurrentUser(res)?.pid);
        res.status(200).json({
            timetable: result.map((tt) => tt.toJSON())
        })
    }).catch((err) => {
        Log.error(`Error getting active grad timetable by termcode: ${JSON.stringify(err)}`, getCurrentUser(res)?.pid);
        res.status(500).send({
            message: "Some error occurred while getting active grad timetable by termcode.",
        });
    })
}

module.exports.setGrad_ClassState = (req, res) => {
    Log.info(`Received request to set grad class state with req: '${JSON.stringify(req.body)}'.`, getCurrentUser(res)?.pid);
    //set Term ${req.params.termcode} CRN ${req.params.crn} to ${(req.params.active == 1) ? "active" : "inactive"}.
    // Validate request
    if (!req.body) {
        Log.warn(`Error setting grad class state: request body is empty.`, getCurrentUser(res)?.pid);
        return res.status(400).send({
            message: "Timetable content can not be empty",
        });
    } else if (!req.body.termcode) {
        Log.warn (`Error setting grad class state: termcode is missing.`, getCurrentUser(res)?.pid);
        return res.status(400).send({
            message: "Must supply a termcode",
        });
    } else if (!req.body.crn) {
        Log.warn (`Error setting grad class state: crn is missing.`, getCurrentUser(res)?.pid);
        return res.status(400).send({
            message: "Must supply a crn",
        });
    } else if (!("state" in req.body)) {
        Log.warn (`Error setting grad class state: state is missing.`, getCurrentUser(res)?.pid);
        return res.status(400).send({
            message: "Must supply state",
        });
    } 
    const state = parseInt(req.body.state);
    if (state < 0 || state > 1) {
        Log.warn (`Error setting grad class state: state was ${state} but must be either 1 or 0.`, getCurrentUser(res)?.pid);
        return res.status(400).send({
            message: `Sent state = ${state}, must be either 0 or 1`,
        });
    }
    
    // Set class state
    const termcode = parseInt(req.body.termcode);
    const crn = parseInt(req.body.crn);
    setGrad_ClassState(termcode, crn, state)
    .then(() => {
        Log.info(
            `Set grad class with termcode:${termcode} and crn:${crn} to state:${state} (${(state==1) ? "Active":"Inactive"})`,
            getCurrentUser(res)?.pid
        );
        res.sendStatus(204);
    }).catch((error) => {
        Log.error(
            `Error setting grad class with termcode:${termcode} and crn:${crn} to state:${state} (${(state==1) ? "Active":"Inactive"})`,
            getCurrentUser(res)?.pid
        );
        res.status(500).send({
            message: `Some error occured while setting grad class state`
        })
    });
}

module.exports.setGrad_ClassIgnore = (req, res) => {
    Log.info(`Received request to set grad class ignore with req: '${JSON.stringify(req.body)}'.`, getCurrentUser(res)?.pid);
    //set Term ${req.params.termcode} CRN ${req.params.crn} to ${(req.params.active == 1) ? "active" : "inactive"}.
    // Validate request
    if (!req.body) {
        Log.warn(`Error setting grad class ignore: request body is empty.`, getCurrentUser(res)?.pid);
        return res.status(400).send({
            message: "Timetable content can not be empty",
        });
    } else if (!req.body.termcode) {
        Log.warn (`Error setting grad class ignore: termcode is missing.`, getCurrentUser(res)?.pid);
        return res.status(400).send({
            message: "Must supply a termcode",
        });
    } else if (!req.body.crn) {
        Log.warn (`Error setting grad class ignore: crn is missing.`, getCurrentUser(res)?.pid);
        return res.status(400).send({
            message: "Must supply a crn",
        });
    } else if (!("ignore" in req.body)) {
        Log.warn (`Error setting grad class ignore: ignore is missing.`, getCurrentUser(res)?.pid);
        return res.status(400).send({
            message: "Must supply ignore",
        });
    } 
    const ignore = parseInt(req.body.ignore);
    if (ignore < 0 || ignore > 1) {
        Log.warn (`Error setting grad class ignore: ignore was ${ignore} but must be either 1 or 0.`, getCurrentUser(res)?.pid);
        return res.status(400).send({
            message: `Sent ignore = ${ignore}, must be either 0 or 1`,
        });
    }
    
    // Set class ignore
    const termcode = parseInt(req.body.termcode);
    const crn = parseInt(req.body.crn);
    setGrad_ClassIgnore(termcode, crn, ignore)
    .then(() => {
        Log.info(
            `Set grad class with termcode:${termcode} and crn:${crn} to ignore:${ignore} (${(ignore==1) ? "Active":"Inactive"})`,
            getCurrentUser(res)?.pid
        );
        res.sendStatus(204);
    }).catch((error) => {
        Log.error(
            `Error setting grad class with termcode:${termcode} and crn:${crn} to ignore:${ignore} (${(ignore==1) ? "Active":"Inactive"})`,
            getCurrentUser(res)?.pid
        );
        res.status(500).send({
            message: `Some error occured while setting grad class ignore`
        })
    });
}

module.exports.getGrad_SectionsByTerm = (req, res) => {
    Log.info('Received request to get grad sections by termcode.', getCurrentUser(res)?.pid);
    if (!req.params.termcode) {
        Log.warn (`Error getting grad sections by termcode: termcode is missing.`, getCurrentUser(res)?.pid);
        return res.status(400).send({
            message: "Must supply a termcode",
        });
    }
    const termcode = parseInt(req.params.termcode);
    getGrad_SectionsByTermCode(termcode).then((result) => {
        Log.info('Successfully got grad sections by termcode.', getCurrentUser(res)?.pid);
        res.status(200).json({
            sections: result.map((tt) => tt.toJSON())
        })
    }).catch((err) => {
        Log.error(`Error getting grad sections by termcode: ${JSON.stringify(err)}`, getCurrentUser(res)?.pid);
        res.status(500).send({
            message: "Some error occurred while getting grad sections by termcode.",
        });
    })
}


module.exports.updateTimeTable = (req, res) => {
    //Check request for some API Key
    //Check when the last time it was called to ensure not pulling too often
    //Update the timetable if all conditions met
    updateGradTimeTable().then((result) => {
        Log.info('Successfully updated timetables',getCurrentUser(res)?.pid);
        res.status(200).json({text:"timetables updated"});
    }).catch((err) => {
        console.log("OOPSIE");
        Log.error(`Error updating the timetables: ${JSON.stringify(err)}`, getCurrentUser(res)?.pid);
        res.status(500).send({message: "Error updating timetables"});
    })
}