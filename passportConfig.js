const LocalStrategy = require("passport-local").Strategy;
const { pool } = require("./dbConfig");
const bcrypt = require("bcrypt");

function initialize(passport){
    const authenticateUser = (email, password, done) => {
        pool.query("SELECT * FROM USERS WHERE email = $1", [email], (err, results) => {
            if(err){
                throw err;
            }
            if (results.rows.length > 0){
                const user = results.rows[0]
                bcrypt.compare(password, user.password, (err, isMatch) => {
                    if(err){
                        throw err;
                    }
                    if(isMatch){
                        return done(null, user);
                    } else {
                        return done(null, false, {message: "Email or password is incorrect"});
                    }
                })
            } else {
                return done(null, false, {message: "Email doesn't exist"});
            }
        });
    }
    passport.use(new LocalStrategy({
        usernameField: "email",
        passwordField: "password"
    }, authenticateUser));
    // Stores user id in session cookie
    passport.serializeUser((user, done) => done(null, user.id));
    // Uses id to obtain user deail from database and store full object in session
    passport.deserializeUser((id, done) => {
        pool.query("SELECT * FROM users WHERE id = $1", [id], (err, results) => {
            if(err){
                throw err;
            }
            return done(null, results.rows[0]);
        });
    });
}

module.exports = initialize;