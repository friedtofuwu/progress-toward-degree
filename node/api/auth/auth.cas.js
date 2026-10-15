const Log = require("../../database/utils/Log");
const { getUserByPID } = require("../../database/utils/User");

const CasStrategy = require("passport-cas").Strategy;

const casStrategy = new CasStrategy(
    {
        version: "CAS3.0",
        ssoBaseURL: "https://login.vt.edu/profile/cas",
        serverBaseURL: `${process.env.SITE_URL}/api`,
        validateURL: "/serviceValidate",
    }, (profile, done) => {
        var pid = profile.user;

        // Set current user
        getUserByPID(pid).then((result) => {
            if (result === null) {
                Log.warn(`Unrecognized user attempted to log in.`, pid);
                return done(new Error("Unrecognized user"));
            } else {
                Log.info('Successful login', pid);
                return done(null, result);
            }
        }).catch((err) => {
            Log.error('Error getting user info after login:', pid, err);
            return done(err);
        });
    }
);

module.exports = casStrategy;
