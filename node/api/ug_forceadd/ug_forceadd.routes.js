module.exports = (app) => {
    const forceAddController = require("./ug_forceadd.controller.js");
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
    app.post("/api/ug/forceadd", isAuthenticated, upload.array("files[]"), forceAddController.newUG_ForceAdd);
    //Get list of forceadd requests
    app.get("/api/ug/forceadd", isAuthenticated, forceAddController.getUG_ForceAddsTable);
    //Get singular forceadd request
    app.get("/api/ug/forceadd/:key", isAuthenticated, forceAddController.getUG_ForceAdd);
    //Updates the internal and external comments of a forceadd request
    app.post(`/api/ug/forceadd/:key/comments`, isAuthenticated, isAdvisor, jsonParser, forceAddController.updateUG_Comments);
    //Updates the status of a force add request
    app.post("/api/ug/forceadd/:key/status", isAuthenticated, isAdvisor, jsonParser, forceAddController.updateUG_Status);
    //Cancels the force add request, if user has correct permissions to do so
    app.delete("/api/ug/forceadd/:key",isAuthenticated, forceAddController.cancelUG_ForceAdd);
    //Gets the academic levels from the database
    //app.get("/api/ug/forceadds/alevels", isAuthenticated, forceAddController.getAcademicLevels);
    //Get CSV of forceadd requests
    app.get("/api/ug/forceadds/csv", isAuthenticated, isAdvisor, forceAddController.UG_ForceAddsCSV);
    //Get test to see how values look on the req end
    app.get("/api/ug/forceadds/test", isAuthenticated, jsonParser, forceAddController.test);
    //Gets list of related ForceAdd Files
    app.get("/api/ug/forceadd/files/:key",isAuthenticated, forceAddController.getUG_FAFiles);
    //Get single ForceAdd File
    app.get("/api/ug/forceadd/file/:key", isAuthenticated, forceAddController.getUG_FAFile);
}