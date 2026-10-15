const Log = require("../../database/utils/Log");
const { getAllGrad_Terms, setGrad_Dates, getActiveGrad_Terms, dropGrad_Term } = require("../../database/utils/Grad_Term");
const { getCurrentUser } = require("../helpers");

module.exports.getGrad_All = (req, res) => {
    Log.info(`Received request to get all grad terms.`, getCurrentUser(res)?.pid);
    getAllGrad_Terms().then((result) => {
        Log.info(`Successfully got all grad terms.`, getCurrentUser(res)?.pid);
        res.status(200).json({
            terms: result.map((terms) => terms.toJSON())
        });
    }).catch((err) => {
        Log.error(`Error getting all grad terms: ${JSON.stringify(err)}`, getCurrentUser(res)?.pid);
        res.status(500).send({
            message: "Some error occured while getting all grad terms."
        });
    })
}

module.exports.getGrad_Active = (req, res) => {
    Log.info(`Received request to get active grad terms.`, getCurrentUser(res)?.pid);
    getActiveGrad_Terms().then((terms) => {
        Log.info(`Successfully got active grad terms.`, getCurrentUser(res)?.pid);
        res.status(200).json({ terms:terms });
    }).catch((err) => {
        Log.error(`Error getting active grad terms: ${JSON.stringify(err)}`, getCurrentUser(res)?.pid);
        res.status(500).send({
            message: "Some error occured while getting active grad terms."
        });
    })
}

module.exports.setGrad_Dates = (req, res) => {
    Log.info(`Received request to set form dates for grad Term with req: '${JSON.stringify(req.body)}'`,getCurrentUser(res)?.pid);
    //Validate request
    if (!req.body) {
        Log.warn(`Error setting form dates for grad Term: request body is empty.`, getCurrentUser(res)?.pid);
        return res.status(400).send({
            message: "Content can not be empty",
        });
    } else if (!req.body.termcode) {
        Log.warn (`Error setting form dates for grad Term: request body does not contain a termcode.`, getCurrentUser(res)?.pid);
        return res.status(400).send({
            message: "Must supply a termcode",
        });
    } else if (!req.body.open) {
        Log.warn (`Error setting form dates for grad Term: request body does not contain an open date.`, getCurrentUser(res)?.pid);
        return res.status(400).send({
            message: "Must supply an open date",
        });
    } else if (!req.body.close) {
        Log.warn (`Error setting form dates for grad Term: request body does not contain a close date.`, getCurrentUser(res)?.pid);
        return res.status(400).send({
            message: "Must supply a close date",
        });
    }

    // Set form dates
    const termcode = parseInt(req.body.termcode);
    const open = req.body.open;
    const close = req.body.close;

    setGrad_Dates(termcode, open, close).then(() => {
        Log.info(`Set grad Term: ${termcode} to open: '${open}' and close: '${close}'.`, getCurrentUser(res)?.pid);
        res.sendStatus(204);
    }).catch((err) => {
        Log.error(`Failed to set grad Term: ${termcode} to open: '${open}' and close: '${close}': ${JSON.stringify(err)}`, getCurrentUser(res)?.pid);
        res.status(500).send({
            message: "Some error occured while setting form dates for grad Term.",
        })
    })
}

module.exports.dropGrad_Term = (req, res) => {
    if (!req.body) {
        Log.warn(`Error Dropping Grad Term: request body is empty.`, getCurrentUser(res)?.pid);
        return res.status(400).send({
            message: "Content can not be empty",
        });
    } else if (!req.body.termcode) {
        Log.warn (`Error Dropping Grad Term: request body does not contain a termcode.`, getCurrentUser(res)?.pid);
        return res.status(400).send({
            message: "Must supply a termcode",
        });
    }
    const termcode = parseInt(req.body.termcode);
    dropGrad_Term(termcode).then(() => {
        Log.info(`Dropped Grad Term ${termcode}`,getCurrentUser(res)?.pid);
        res.sendStatus(200);
    }).catch((err) => {
        Log.error(`Failed to Drop Grad Term ${termcode} : ${JSON.stringify(err)}`, getCurrentUser(res)?.pid);
        res.status(500).send({
            message: "Some error ocurred while dropping the grad term."
        })
    })
}