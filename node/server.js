require('dotenv').config()
const { DB, tableNames } = require("./database/handler.js")
const { getUserByPID, addUser } = require('./database/utils/User.js');
const Log = require('./database/utils/Log.js');
const fs = require('fs');

var app = require("express")();
const session = require("express-session");
app.use(
    session({
        secret: "this is totally secret",
        resave: false,
        saveUninitialized: false,
    })
);

// CAS
const passport = require("passport");
const casStrategy = require("./api/auth/auth.cas.js");
app.use(passport.initialize());
app.use(passport.session());
passport.use(casStrategy);
passport.serializeUser((user, done) => {
    if (user !== null)
        done(null, user.pid);
    else
        done(new Error('Provided user was null.'), null);
});
passport.deserializeUser((pid, done) => {
    getUserByPID(pid).then((user) => {
        if (user === null) {
            Log.warn(`Could not deserialize user: user of PID '${pid}' not found in the database.`);
            return done(new Error('Could not deserialize user: user not found in the database.'), null);
        } else {
            return done(null, user);
        }
    }).catch((err) => {
        Log.error(`Could not deserialize user: could not find user by PID in the database:`, null, err);
        return done(new Error('Could not deserialize user: could not find user by PID in the database'), null);
    })
});

// Set Current User and pass down connection pool
app.use((req, res, next) => {
    res.locals.currentUser = req.user;
    next();
});

// Import Routes
require("./api/auth/auth.routes.js")(app);
require("./api/user/user.routes.js")(app);
require("./api/logs/logs.routes.js")(app);
require("./api/submission/submission.routes.js")(app);
require("./api/checksheet/checksheet.routes.js")(app);
require("./api/student/student.routes.js")(app);
require("./api/violations/violation.routes.js")(app);
require("./api/term/term.routes.js")(app);
require("./api/timetable/timetable.routes.js")(app);
require("./api/forceadd/forceadd.routes.js")(app);
require("./api/ug_term/ug_term.routes.js")(app);
require("./api/ug_timetable/ug_timetable.routes.js")(app);
require("./api/ug_forceadd/ug_forceadd.routes.js")(app);
require("./api/grad_term/grad_term.routes.js")(app);
require("./api/grad_timetable/grad_timetable.routes.js")(app);
require("./api/grad_forceadd/grad_forceadd.routes.js")(app);
require("./api/audit/audit.routes.js")(app);

const PORT = +process.env.PORT || 5000;

var server = null;
let connections = [];

// Handle shutdown
function serverShutdown() {
    console.log('Received kill signal, shutting down server gracefully...');

    // Close any database connections
    DB.end();

    // Close server
    server?.close((err) => {
        if (err) {
            console.error('Error closing server:', err);
        } else {
            console.log("Server closed successfully.");
            process.exit(0);
        }
    })

    setTimeout(() => {
        console.error("Failed to close server in time, forcefully shutting down.");
        process.exit(1);
    }, 10000)

    // End connections
    connections.forEach((connection) => connection.end());
    setTimeout(() => connections.forEach((connection) => connection.destroy()), 5000)
}
process.on('SIGTERM', serverShutdown);
process.on('SIGINT', serverShutdown);

// Initialize database and start
DB.init(20).then(async (couldConnect) => {
    if (couldConnect) {
        console.log('[INFO] Initializing database...');

        // Add init admin
        if (+process.env.INIT_ADMIN) {
            if (process.env.INIT_ADMIN_PID) {
                try {
                    await addUser(process.env.INIT_ADMIN_PID, 2)
                    Log.info("Added as admin on server startup", process.env.INIT_ADMIN_PID);
                } catch (err) {
                    if (err.code.includes("DUP_"))
                        Log.warn(
                            "Could not add as admin on server startup: already present in the database",
                            process.env.INIT_ADMIN_PID
                        );
                    else
                        Log.error('Error adding server startup init admin:', null, err);
                }
            } else {
                Log.error("Could not add admin on server startup: INIT_ADMIN_PID not given");
            }
        } else {
            Log.info("Skipped adding admin on server startup: INIT_ADMIN is 0");
        }

        console.log('[INFO] Done initializing database.')

        app.locals.pem = "";
        console.log('[INFO] Loaded key.')

        // Start server
        server = app.listen(PORT, () => {
            const host = server.address().address
            console.log("Node backend listening at http://%s:%s", host, PORT);
        });

        // Track connections to server
        server.on('connection', (connection) => {
            connections.push(connection);
            connection.on('close', () => (
                connections = connections.filter((curr) => (curr != connection))
            ))
        })
    } else {
        console.error("Could not connect to the database. Shutting down.");
        DB.end();
        process.exit(1);
    }
})
