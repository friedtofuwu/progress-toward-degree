// const { uniqueSuffix } = require("../helpers.js");

// module.exports = (app) => {
//     const submissionController = require("./submission.controller.js");
//     const { isAuthenticated } = require("../auth/auth.status.js");
//     const multer = require('multer');
//     const storage = multer.diskStorage({
//         destination: submissionController.uploadPath,
//         filename: (req, file, cb) => {
//             cb(null, file.fieldname + '-' + uniqueSuffix());
//         }
//     });
//     const upload = multer({ storage: storage, preservePath: true });

//     // Get the current status of the submission
//     app.get("/api/submission/info", isAuthenticated, submissionController.getImportStatus);

//     // Import a new submission
//     app.post("/api/submission", isAuthenticated, upload.array("files"), submissionController.import);

//     // Get a spreadsheet for the latest submission
//     app.get("/api/submission", isAuthenticated, submissionController.export);

//     // Get the full submission history
//     app.get("/api/submission/history", isAuthenticated, submissionController.getSubmissionHistory);
// };

// No-op route module. P91 endpoints removed.
module.exports = () => {};

