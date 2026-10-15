const Log = require("../../database/utils/Log.js");
const { getAllUG_Timetables, getAllUG_TimetablesByTermCode, getAllActiveUG_TimetablesByTermCode, getAllActiveByClass, updateUGTimeTable, setUG_ClassState, setUG_ClassIgnore, getAllActiveUG_ClassesByTermCode, getAllActiveUG_SectionsByTermCodeAndCourseId, getUG_SectionsByTermCode } = require("../../database/utils/UG_TimeTable.js");
const { getCurrentUser } = require("../helpers.js");

module.exports.getFullUG_Timetable = (req, res) => {
    Log.info('Received request to get full ug timetable.', getCurrentUser(res)?.pid);
    getAllUG_Timetables().then((result) => {
        Log.info('Suggessfully got full ug timetable.', getCurrentUser(res)?.pid);
        res.status(200).json({
            timetable: result.map((tt) => tt.toJSON())
        })
    }).catch((err) => {
        Log.error(`Error getting full ug timetable: ${JSON.stringify(err)}`, getCurrentUser(res)?.pid);
        res.status(500).send({
            message: "Some error occurred while getting full ug timetable.",
        });
    })
}

module.exports.getUG_Classes = (req,res) => {
    Log.info('Received request to get active ug classes by termcode.', getCurrentUser(res)?.pid);
    if (!req.params.termcode) {
        Log.warn (`Error getting active ug classes by termcode: termcode is missing.`, getCurrentUser(res)?.pid);
        return res.status(400).send({
            message: "Must supply a termcode",
        });
    }
    const termcode = parseInt(req.params.termcode);
    console.log("TERMCODE:"+termcode);
    getAllActiveUG_ClassesByTermCode(termcode).then((result) => {
        Log.info('Suggessfully got active ug classes by termcode.', getCurrentUser(res)?.pid);
        res.status(200).json({
            classes: result
        })
    }).catch((err) => {
        Log.error(`Error getting active ug classes by termcode: ${JSON.stringify(err)}`, getCurrentUser(res)?.pid);
        res.status(500).send({
            message: "Some error occurred while getting active ug classes by termcode.",
        });
    })
}

module.exports.getUG_ClassSections = (req,res) => {
    Log.info('Received request to get active ug sections by termcode and course ID.', getCurrentUser(res)?.pid);
    if (!req.params.termcode) {
        Log.warn (`Error getting active ug sections by termcode and course ID: termcode is missing.`, getCurrentUser(res)?.pid);
        return res.status(400).send({
            message: "Must supply a termcode",
        });
    }
    if (!req.params.course_id) {
        Log.warn (`Error getting active ug sections by termcode and course ID: course ID is missing.`, getCurrentUser(res)?.pid);
        return res.status(400).send({
            message: "Must supply a course ID",
        });
    }
    const termcode = parseInt(req.params.termcode);
    const course_id = req.params.course_id;
    console.log("TERMCODE:"+termcode+" CLASS:"+course_id);
    getAllActiveUG_SectionsByTermCodeAndCourseId(termcode, course_id).then((result) => {
        Log.info('Suggessfully got active ug sections by termcode and course ID.', getCurrentUser(res)?.pid);
        res.status(200).json({
            timetable: result.map((tt) => tt.toJSON())
        })
    }).catch((err) => {
        Log.error(`Error getting active ug sections by termcode and course ID: ${JSON.stringify(err)}`, getCurrentUser(res)?.pid);
        res.status(500).send({
            message: "Some error occurred while getting active ug sections by termcode and course ID.",
        });
    })
}

module.exports.getActiveUG_TimetableByTermCode = (req, res) => {
    Log.info('Received request to get active ug timetable by termcode.', getCurrentUser(res)?.pid);
    if (!req.params.termcode) {
        Log.warn (`Error getting active ug timetable by termcode: termcode is missing.`, getCurrentUser(res)?.pid);
        return res.status(400).send({
            message: "Must supply a termcode",
        });
    }
    const termcode = parseInt(req.params.termcode);
    getAllActiveUG_TimetablesByTermCode(termcode).then((result) => {
        Log.info('Suggessfully got active ug timetable by termcode.', getCurrentUser(res)?.pid);
        res.status(200).json({
            timetable: result.map((tt) => tt.toJSON())
        })
    }).catch((err) => {
        Log.error(`Error getting active ug timetable by termcode: ${JSON.stringify(err)}`, getCurrentUser(res)?.pid);
        res.status(500).send({
            message: "Some error occurred while getting active ug timetable by termcode.",
        });
    })
}

module.exports.setUG_ClassState = (req, res) => {
    Log.info(`Received request to set ug class state with req: '${JSON.stringify(req.body)}'.`, getCurrentUser(res)?.pid);
    //set Term ${req.params.termcode} CRN ${req.params.crn} to ${(req.params.active == 1) ? "active" : "inactive"}.
    // Validate request
    if (!req.body) {
        Log.warn(`Error setting ug class state: request body is empty.`, getCurrentUser(res)?.pid);
        return res.status(400).send({
            message: "Timetable content can not be empty",
        });
    } else if (!req.body.termcode) {
        Log.warn (`Error setting ug class state: termcode is missing.`, getCurrentUser(res)?.pid);
        return res.status(400).send({
            message: "Must supply a termcode",
        });
    } else if (!req.body.crn) {
        Log.warn (`Error setting ug class state: crn is missing.`, getCurrentUser(res)?.pid);
        return res.status(400).send({
            message: "Must supply a crn",
        });
    } else if (!("state" in req.body)) {
        Log.warn (`Error setting ug class state: state is missing.`, getCurrentUser(res)?.pid);
        return res.status(400).send({
            message: "Must supply state",
        });
    } 
    const state = parseInt(req.body.state);
    if (state < 0 || state > 1) {
        Log.warn (`Error setting ug class state: state was ${state} but must be either 1 or 0.`, getCurrentUser(res)?.pid);
        return res.status(400).send({
            message: `Sent state = ${state}, must be either 0 or 1`,
        });
    }
    
    // Set class state
    const termcode = parseInt(req.body.termcode);
    const crn = parseInt(req.body.crn);
    setUG_ClassState(termcode, crn, state)
    .then(() => {
        Log.info(
            `Set ug class with termcode:${termcode} and crn:${crn} to state:${state} (${(state==1) ? "Active":"Inactive"})`,
            getCurrentUser(res)?.pid
        );
        res.sendStatus(204);
    }).catch((error) => {
        Log.error(
            `Error setting ug class with termcode:${termcode} and crn:${crn} to state:${state} (${(state==1) ? "Active":"Inactive"})`,
            getCurrentUser(res)?.pid
        );
        res.status(500).send({
            message: `Some error occured while setting ug class state`
        })
    });
}

module.exports.setUG_ClassIgnore = (req, res) => {
    Log.info(`Received request to set ug class ignore with req: '${JSON.stringify(req.body)}'.`, getCurrentUser(res)?.pid);
    //set Term ${req.params.termcode} CRN ${req.params.crn} to ${(req.params.active == 1) ? "active" : "inactive"}.
    // Validate request
    if (!req.body) {
        Log.warn(`Error setting ug class ignore: request body is empty.`, getCurrentUser(res)?.pid);
        return res.status(400).send({
            message: "Timetable content can not be empty",
        });
    } else if (!req.body.termcode) {
        Log.warn (`Error setting ug class ignore: termcode is missing.`, getCurrentUser(res)?.pid);
        return res.status(400).send({
            message: "Must supply a termcode",
        });
    } else if (!req.body.crn) {
        Log.warn (`Error setting ug class ignore: crn is missing.`, getCurrentUser(res)?.pid);
        return res.status(400).send({
            message: "Must supply a crn",
        });
    } else if (!("ignore" in req.body)) {
        Log.warn (`Error setting ug class ignore: ignore is missing.`, getCurrentUser(res)?.pid);
        return res.status(400).send({
            message: "Must supply ignore",
        });
    } 
    const ignore = parseInt(req.body.ignore);
    if (ignore < 0 || ignore > 1) {
        Log.warn (`Error setting ug class ignore: ignore was ${ignore} but must be either 1 or 0.`, getCurrentUser(res)?.pid);
        return res.status(400).send({
            message: `Sent ignore = ${ignore}, must be either 0 or 1`,
        });
    }
    
    // Set class ignore
    const termcode = parseInt(req.body.termcode);
    const crn = parseInt(req.body.crn);
    setUG_ClassIgnore(termcode, crn, ignore)
    .then(() => {
        Log.info(
            `Set ug class with termcode:${termcode} and crn:${crn} to ignore:${ignore} (${(ignore==1) ? "Active":"Inactive"})`,
            getCurrentUser(res)?.pid
        );
        res.sendStatus(204);
    }).catch((error) => {
        Log.error(
            `Error setting ug class with termcode:${termcode} and crn:${crn} to ignore:${ignore} (${(ignore==1) ? "Active":"Inactive"})`,
            getCurrentUser(res)?.pid
        );
        res.status(500).send({
            message: `Some error occured while setting ug class ignore`
        })
    });
}

module.exports.getUG_SectionsByTerm = (req, res) => {
    Log.info('Received request to get ug sections by termcode.', getCurrentUser(res)?.pid);
    if (!req.params.termcode) {
        Log.warn (`Error getting ug sections by termcode: termcode is missing.`, getCurrentUser(res)?.pid);
        return res.status(400).send({
            message: "Must supply a termcode",
        });
    }
    const termcode = parseInt(req.params.termcode);
    getUG_SectionsByTermCode(termcode).then((result) => {
        Log.info('Suggessfully got ug sections by termcode.', getCurrentUser(res)?.pid);
        res.status(200).json({
            sections: result.map((tt) => tt.toJSON())
        })
    }).catch((err) => {
        Log.error(`Error getting ug sections by termcode: ${JSON.stringify(err)}`, getCurrentUser(res)?.pid);
        res.status(500).send({
            message: "Some error occurred while getting ug sections by termcode.",
        });
    })
}


module.exports.updateTimeTable = (req, res) => {
    //Check request for some API Key
    //Check when the last time it was called to ensure not pulling too often
    //Update the timetable if all conditions met
    updateUGTimeTable().then((result) => {
        Log.info('Successfully updated timetables',getCurrentUser(res)?.pid);
        res.status(200).json({text:"timetables updated"});
    }).catch((err) => {
        console.log("OOPSIE");
        Log.error(`Error updating the timetables: ${JSON.stringify(err)}`, getCurrentUser(res)?.pid);
        res.status(500).send({message: "Error updating timetables"});
    })
}