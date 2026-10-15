module.exports = (app) => {
    const forceAddController = require("./forceadd.controller.js");
    const { isAuthenticated, isAdvisor } = require("../auth/auth.status.js");
    const { uniqueSuffix, splitFileName } = require("../helpers.js");
    const multer = require('multer');
    var bodyParser = require("body-parser");

    // create application/json parser
    var jsonParser = bodyParser.json();

    // create multer
    const storage = multer.diskStorage({
        destination: forceAddController.uploadPath,
        filename: (req, file, cb) => {
            let fn = splitFileName(file.originalname);
            cb(null, fn[0] + '-' + uniqueSuffix() + '.' + fn[1]);
        }
    });
    const upload = multer({
        storage: storage,
        preservePath: true,
        fileFilter: (req, file, cb) => {
            const allowedTypes = ["application/pdf","image/png", "image/jpeg"]
            if (!allowedTypes.includes(file.mimetype)) {
                return cb(new Error("Invalid file type."));
            }
            cb(null, true);
        }
    });

    //Submit a forceadd request
    app.post("/api/forceadd", isAuthenticated, upload.array("files[]"), forceAddController.newForceAdd);
    //Get list of forceadd requests
    app.get("/api/forceadd", isAuthenticated, forceAddController.getForceAddsTable);
    //Get singular forceadd request
    app.get("/api/forceadd/:key", isAuthenticated, forceAddController.getForceAdd);
    //Updates the internal and external comments of a forceadd request
    app.post(`/api/forceadd/:key/comments`, isAuthenticated, isAdvisor, jsonParser, forceAddController.updateComments);
    //Updates the status of a force add request
    app.post("/api/forceadd/:key/status", isAuthenticated, isAdvisor, jsonParser, forceAddController.updateStatus);
    //Cancels the force add request, if user has correct permissions to do so
    app.delete("/api/forceadd/:key",isAuthenticated, forceAddController.cancelForceAdd);
    //Gets the academic levels from the database
    //app.get("/api/forceadds/alevels", isAuthenticated, forceAddController.getAcademicLevels);
    //Get CSV of forceadd requests
    app.get("/api/forceadds/csv", isAuthenticated, isAdvisor, forceAddController.ForceAddsCSV);
    //Get test to see how values look on the req end
    app.get("/api/forceadds/test", isAuthenticated, jsonParser, forceAddController.test);
    //Gets list of related ForceAdd Files
    app.get("/api/forceadd/files/:key",isAuthenticated, forceAddController.getFAFiles);
    //Get single ForceAdd File
    app.get("/api/forceadd/file/:key", isAuthenticated, forceAddController.getFAFile);
}