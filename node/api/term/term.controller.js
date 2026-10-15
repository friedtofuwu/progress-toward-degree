const Log = require("../../database/utils/Log");
const { getAllTerms, setDates, getActiveTerms, dropTerm } = require("../../database/utils/Term");
const { getCurrentUser } = require("../helpers");

module.exports.getAll = (req, res) => {
    Log.info(`Received request to get all terms.`, getCurrentUser(res)?.pid);
    getAllTerms().then((result) => {
        Log.info(`Successfully got all terms.`, getCurrentUser(res)?.pid);
        res.status(200).json({
            terms: result.map((terms) => terms.toJSON())
        });
    }).catch((err) => {
        Log.error(`Error getting all terms: ${JSON.stringify(err)}`, getCurrentUser(res)?.pid);
        res.status(500).send({
            message: "Some error occured while getting all terms."
        });
    })
}

module.exports.getActive = (req, res) => {
    Log.info(`Received request to get active terms.`, getCurrentUser(res)?.pid);
    getActiveTerms().then((terms) => {
        Log.info(`Successfully got active terms.`, getCurrentUser(res)?.pid);
        res.status(200).json({ terms:terms });
    }).catch((err) => {
        Log.error(`Error getting active terms: ${JSON.stringify(err)}`, getCurrentUser(res)?.pid);
        res.status(500).send({
            message: "Some error occured while getting active terms."
        });
    })
}

module.exports.setDates = (req, res) => {
    Log.info(`Received request to set form dates for Term with req: '${JSON.stringify(req.body)}'`,getCurrentUser(res)?.pid);
    //Validate request
    if (!req.body) {
        Log.warn(`Error setting form dates for Term: request body is empty.`, getCurrentUser(res)?.pid);
        return res.status(400).send({
            message: "Content can not be empty",
        });
    } else if (!req.body.termcode) {
        Log.warn (`Error setting form dates for Term: request body does not contain a termcode.`, getCurrentUser(res)?.pid);
        return res.status(400).send({
            message: "Must supply a termcode",
        });
    } else if (!req.body.open) {
        Log.warn (`Error setting form dates for Term: request body does not contain an open date.`, getCurrentUser(res)?.pid);
        return res.status(400).send({
            message: "Must supply an open date",
        });
    } else if (!req.body.close) {
        Log.warn (`Error setting form dates for Term: request body does not contain a close date.`, getCurrentUser(res)?.pid);
        return res.status(400).send({
            message: "Must supply a close date",
        });
    }

    // Set form dates
    const termcode = parseInt(req.body.termcode);
    const open = req.body.open;
    const close = req.body.close;

    setDates(termcode, open, close).then(() => {
        Log.info(`Set Term: ${termcode} to open: '${open}' and close: '${close}'.`, getCurrentUser(res)?.pid);
        res.sendStatus(204);
    }).catch((err) => {
        Log.error(`Failed to set Term: ${termcode} to open: '${open}' and close: '${close}': ${JSON.stringify(err)}`, getCurrentUser(res)?.pid);
        res.status(500).send({
            message: "Some error occured while setting form dates for Term.",
        })
    })
}

module.exports.dropTerm = (req, res) => {
    if (!req.body) {
        Log.warn(`Error Dropping Term: request body is empty.`, getCurrentUser(res)?.pid);
        return res.status(400).send({
            message: "Content can not be empty",
        });
    } else if (!req.body.termcode) {
        Log.warn (`Error Dropping Term: request body does not contain a termcode.`, getCurrentUser(res)?.pid);
        return res.status(400).send({
            message: "Must supply a termcode",
        });
    }
    const termcode = parseInt(req.body.termcode);
    dropTerm(termcode).then(() => {
        Log.info(`Dropped ${termcode} Term`,getCurrentUser(res)?.pid);
        res.sendStatus(200);
    }).catch((err) => {
        Log.error(`Failed to Drop ${termcode} Term : ${JSON.stringify(err)}`, getCurrentUser(res)?.pid);
        res.status(500).send({
            message: "Some error ocurred while dropping the term."
        })
    })
}