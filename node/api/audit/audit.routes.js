const { uniqueSuffix } = require("../helpers.js");

module.exports = (app) => {
    const auditController = require("./audit.controller.js");
    const { isAuthenticated, isAdvisor } = require("../auth/auth.status.js");
    const multer = require('multer');
    const storage = multer.diskStorage({
        destination: auditController.uploadPath,
        filename: (req, file, cb) => {
            cb(null, file.fieldname + '-' + uniqueSuffix());
        }
    });
    const upload = multer({ storage: storage, preservePath: true });

    // Submit a new audit
    app.post("/api/audit", isAuthenticated, isAdvisor, upload.array("files"), auditController.import);

    // Get students associated with the audit
    app.get("/api/audit/:audit_id", isAuthenticated, isAdvisor, auditController.getAuditResults);

    // Get a spreadsheet for the audit with audit_id
    app.get("/api/audit-file/:audit_id", isAuthenticated, isAdvisor, auditController.exportAuditFile);

    // Get the full audit history for user with pid
    app.get("/api/audit/history/:pid", isAuthenticated, isAdvisor, auditController.getAuditHistory);
    
    // Get the current status of the audit with audit_id
    app.get("/api/audit/:audit_id/info", isAuthenticated, isAdvisor, auditController.getAuditRunInfo);
};
