const crypto = require('crypto');
const { User } = require('./database/utils/User');
const { getAuditById } = require('./database/utils/AuditInfo');

// This mode must use a separate database containing demonstration data only.
module.exports = function demo(req, res, next) {
    if (!req.path.startsWith('/api/')) return next();
    if (!req.session.demoPID) req.session.demoPID = `demo${crypto.randomBytes(6).toString('hex')}`;
    const user = new User({ pid: req.session.demoPID, permissions: 1, campus: 2 });
    const json = user.toJSON();
    user.toJSON = () => ({ ...json, demo: true });
    req.user = user;
    req.isAuthenticated = () => true;
    res.locals.currentUser = user;

    if (req.path === '/api/login') return res.redirect('/audits');
    if (req.path === '/api/logout') return req.session.destroy(() => res.redirect('/'));
    if (req.path === '/api/health') return next();

    const readable = req.method === 'GET' && (
        req.path === '/api/currentUser' || req.path === '/api/audit/status' ||
        /^\/api\/demo\/sample\/(progress|warehouse)$/.test(req.path) ||
        /^\/api\/audit\/history\/[^/]+$/.test(req.path) ||
        /^\/api\/audit\/\d+(\/info)?$/.test(req.path) ||
        /^\/api\/audit-file\/\d+$/.test(req.path) ||
        req.path === '/api/checksheet/get/numbers' ||
        /^\/api\/checksheet\/get\/year\/\d{4}(\/[\w-]+)?$/.test(req.path) ||
        /^\/api\/checksheet\/categories\/\d{4}\/[\w-]+$/.test(req.path)
    );
    const upload = req.method === 'POST' && req.path === '/api/audit';
    if (!readable && !upload) return res.status(403).json({ message: 'This action is unavailable in the public demo.' });

    if (upload) {
        const queue = require('./api/audit/audit.queue');
        if (queue.queue.length >= 10) return res.status(429).json({ message: 'The demo is busy. Please try again shortly.' });
        const now = Date.now();
        const recent = (req.session.demoImports || []).filter(time => now - time < 3600000);
        if (recent.length >= 5) return res.status(429).json({ message: 'Demo limit reached. Please try again in one hour.' });
        req.session.demoImports = [...recent, now];
    }

    const match = req.path.match(/^\/api\/(?:audit|audit-file)\/(\d+)(?:\/info)?$/);
    if (!match) return next();
    getAuditById(match[1]).then(audit => {
        if (!audit || audit.initiating_user_pid !== user.pid) {
            return res.status(404).json({ message: 'Audit not found in your demo session.' });
        }
        next();
    }).catch(next);
};
