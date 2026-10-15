const Log = require("../../database/utils/Log");
const { getAllUG_Terms, setUG_Dates, getActiveUG_Terms, dropUG_Term } = require("../../database/utils/UG_Term");
const { getCurrentUser } = require("../helpers");

module.exports.getUG_All = (req, res) => {
    Log.info(`Received request to get all ug terms.`, getCurrentUser(res)?.pid);
    getAllUG_Terms().then((result) => {
        Log.info(`Successfully got all ug terms.`, getCurrentUser(res)?.pid);
        res.status(200).json({
            terms: result.map((terms) => terms.toJSON())
        });
    }).catch((err) => {
        Log.error(`Error getting all ug terms: ${JSON.stringify(err)}`, getCurrentUser(res)?.pid);
        res.status(500).send({
            message: "Some error occured while getting all ug terms."
        });
    })
}

module.exports.getUG_Active = (req, res) => {
    Log.info(`Received request to get active ug terms.`, getCurrentUser(res)?.pid);
    getActiveUG_Terms().then((terms) => {
        Log.info(`Successfully got active ug terms.`, getCurrentUser(res)?.pid);
        res.status(200).json({ terms:terms });
    }).catch((err) => {
        Log.error(`Error getting active ug terms: ${JSON.stringify(err)}`, getCurrentUser(res)?.pid);
        res.status(500).send({
            message: "Some error occured while getting active ug terms."
        });
    })
}

module.exports.setUG_Dates = (req, res) => {
    Log.info(`Received request to set form dates for ug Term with req: '${JSON.stringify(req.body)}'`,getCurrentUser(res)?.pid);
    //Validate request
    if (!req.body) {
        Log.warn(`Error setting form dates for ug Term: request body is empty.`, getCurrentUser(res)?.pid);
        return res.status(400).send({
            message: "Content can not be empty",
        });
    } else if (!req.body.termcode) {
        Log.warn (`Error setting form dates for ug Term: request body does not contain a termcode.`, getCurrentUser(res)?.pid);
        return res.status(400).send({
            message: "Must supply a termcode",
        });
    } else if (!req.body.open) {
        Log.warn (`Error setting form dates for ug Term: request body does not contain an open date.`, getCurrentUser(res)?.pid);
        return res.status(400).send({
            message: "Must supply an open date",
        });
    } else if (!req.body.close) {
        Log.warn (`Error setting form dates for ug Term: request body does not contain a close date.`, getCurrentUser(res)?.pid);
        return res.status(400).send({
            message: "Must supply a close date",
        });
    }

    // Set form dates
    const termcode = parseInt(req.body.termcode);
    const open = req.body.open;
    const close = req.body.close;

    setUG_Dates(termcode, open, close).then(() => {
        Log.info(`Set ug Term: ${termcode} to open: '${open}' and close: '${close}'.`, getCurrentUser(res)?.pid);
        res.sendStatus(204);
    }).catch((err) => {
        Log.error(`Failed to set ug Term: ${termcode} to open: '${open}' and close: '${close}': ${JSON.stringify(err)}`, getCurrentUser(res)?.pid);
        res.status(500).send({
            message: "Some error occured while setting form dates for ug Term.",
        })
    })
}

module.exports.dropUG_Term = (req, res) => {
    if (!req.body) {
        Log.warn(`Error Dropping UG Term: request body is empty.`, getCurrentUser(res)?.pid);
        return res.status(400).send({
            message: "Content can not be empty",
        });
    } else if (!req.body.termcode) {
        Log.warn (`Error Dropping UG Term: request body does not contain a termcode.`, getCurrentUser(res)?.pid);
        return res.status(400).send({
            message: "Must supply a termcode",
        });
    }
    const termcode = parseInt(req.body.termcode);
    dropUG_Term(termcode).then(() => {
        Log.info(`Dropped UG Term ${termcode}`,getCurrentUser(res)?.pid);
        res.sendStatus(200);
    }).catch((err) => {
        Log.error(`Failed to Drop UG Term ${termcode} : ${JSON.stringify(err)}`, getCurrentUser(res)?.pid);
        res.status(500).send({
            message: "Some error ocurred while dropping the ug term."
        })
    })
}