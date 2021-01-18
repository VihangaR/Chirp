const express = require("express");
const app = express();
const socket = require("socket.io");
const { pool, redisClient } = require("./dbConfig");
const bcrypt = require("bcrypt");
const session = require("express-session");
const flash = require("express-flash");
const passport = require("passport");

const initalizePassport = require("./passportConfig");
initalizePassport(passport);
// Setup the server on port 5000
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
    console.log("Server started on port:", PORT);
});
const io = socket(server);

// Use ejs for templating
app.set("view engine", "ejs");
// Use the static files in the public directory
app.use(express.static(__dirname + "/public"));
// Lets us parse nested objects
app.use(express.urlencoded({extended: true}));
app.use(session({
    secret: "mysecret",
    resave: false,
    saveUninitialized: false
}));
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());

// Is logged in middleware
function isLoggedIn(req, res, next){
    if(req.isAuthenticated()){
        return next();
    };
    res.redirect("/login");
}

// Get Requests
app.get("/", (req, res) => {
    pool.query("SELECT * FROM rooms", (err, results) => {
        if(req.user == undefined){
            res.render("index", {servers: results.rows});
        } else {
            if(err) return console.log(err);
            res.render("index", {name: req.user.name, email: req.user.email, handle: req.user.handle, servers: results.rows});
        }
    });
});

app.get("/register", (req, res) => {
    res.render("register");
});

app.get("/login", (req, res) => {
    res.render("login");
});

app.get("/rooms", (req, res) => {
    res.render("rooms", {user: "Vihanga"});
});

app.get("/logout", (req, res) => {
    req.logOut();
    req.flash("success_msg", "You have logged out");
    res.redirect("/login");
});

app.get("/room/:roomName", isLoggedIn, (req, res) => {
    const roomName = req.params.roomName.toLowerCase();
    redisClient.get(roomName, function(err, data){
        let realName = JSON.parse(data);
        realName = realName.roomName;
        if(err || data == null){
            // Room doesn't exist, redirect to main page
            res.redirect("/");
        } else {
            // Room exists so retrieve the messages and render the page
            pool.query("SELECT * FROM messages WHERE room = $1", [roomName], (err, results) => {
                if(err){
                    throw err;
                }
                res.render("room", {name: req.user.name, email: req.user.email, handle: req.user.handle, msg: results.rows, roomName: roomName, realName: realName});
            });
        }
    });
});

app.get("/roomtest", (req, res) => {
    res.render("room", {handle: "Vihanga", msg: []});
});

// Post requests
app.post("/createroom", isLoggedIn, (req, res) => {
    // Removes all special chars
    const roomName = req.body.roomName.replace(/[^a-z\d\s]+/gi, "");
    roomNameLowerCase = roomName.toLowerCase();
    roomNameLowerCase = roomNameLowerCase.split(" ").join("-")
    if(roomName.length <= 100){
        redisClient.get(roomNameLowerCase, function(err, data){
            if(err || data == null){
                // Room doesn't exist so we can make the room
                pool.query("INSERT INTO rooms (roomname, realroomname) VALUES ($1, $2)", [roomNameLowerCase, roomName], (err, results) => {
                    if(err){
                        throw err;
                    }
                });
                const redisVal = {
                    users: [],
                    roomName: roomName
                }
                redisClient.set(roomNameLowerCase, JSON.stringify(redisVal), function(err, data){
                    if(err){
                        throw err;
                    }
                    res.redirect("/room/" + roomNameLowerCase);
                });
            } else {
                res.redirect("/room/" + roomNameLowerCase);
            }
        });
    }
});

app.post("/login", passport.authenticate("local", {
    successRedirect: "/",
    failureRedirect: "/login",
    failureFlash: true
}))
app.post("/register", async (req, res) => {
    let { name, email, handle, password, password2 } = req.body;
    handle = handle.replace(/\s/g, "");
    let errors = []
    // Form validation
    if (!name || !email || !password || !password2) {
        errors.push({message: "Please fill out all fields."})
    }
    if (password.length < 8) {
        errors.push({ message: "Passwords should be at least 8 characters long."})
    }
    if (password != password2) {
        errors.push({ message: "Passwords do not match."})
    }

    if (errors.length > 0) {
        res.render("register", { errors: errors });
    } else {
        let hashedPassword = await bcrypt.hash(password, 10);
        pool.query("SELECT * FROM users WHERE email = $1 OR handle = $2", [email, handle], (err, results) => {
            if(err){
                throw err;
            }
            if(results.rows.length > 0){
                if(results.rows[0].email == email){
                    errors.push({message: "Email already registered"});
                } else if (results.rows[0].handle == handle){
                    errors.push({message: "Handle already in use"});
                }
                res.render("register", { errors })
            } else {
                const dp = "temp"
                pool.query("INSERT INTO users (name, email, password, handle, dp) VALUES ($1, $2, $3, $4, $5) RETURNING id, password", [name, email, hashedPassword, handle, dp], (err, results) => {
                    if (err){
                        throw err;
                    }
                    req.flash("success_msg", "You are now registered! Please log in.");
                    res.redirect("/login")
                })
            }
        })
    }
});

io.on("connection", function(socket){
    socket.on("joined-room", (data) => {
        let handle = data.handle;
        let roomName = data.roomName;
        socket.join(roomName);
        socket.handle = handle;
        socket.roomName = roomName;
        redisClient.get(roomName, function(err, data){
            if(err){
                throw err;
            }
            let gData = JSON.parse(data);
            gData.users.push(handle);
            initializeUserList(gData.users);
            updateOtherPeoplesList(true, socket.handle);
            gData = JSON.stringify(gData);
            redisClient.set(roomName, gData);
        });
    });
    socket.on("disconnect", () => {
        redisClient.get(socket.roomName, function(err, data){
            if(err){
                throw err;
            }
            let gData = JSON.parse(data);
            gData.users = gData.users.filter(e => e != socket.handle);
            gData = JSON.stringify(gData);
            updateOtherPeoplesList(false, socket.handle);
            redisClient.set(socket.roomName, gData);
        });
    });
    function updateOtherPeoplesList(method, handle){
        if(method == true){
            socket.to(socket.roomName).emit("add-user", handle)
        } else {
            socket.to(socket.roomName).emit("delete-user", handle)
        }
    }
    function initializeUserList(userlist){
        socket.emit("initial-list", userlist);
    }
    socket.on("chat-message", (data) => {
        // Add to server
        // An improvement could be to cache x number of messages in memory then batch upload
        pool.query("INSERT INTO messages (handle, message, room) VALUES ($1, $2, $3)", [socket.handle, data.msg, socket.roomName], (err, results) => {
            if (err){
                throw err;
            }
        });
        // Send msg to others
        io.to(socket.roomName).emit("chat-message", data);
    });
});

// Redis Debugging Commands

// redisClient.keys("*", function(err, keys){
//     console.log(keys);
//     for(i = 0; i < keys.length; i++){
//         redisClient.del(keys[i])
//     }
//     console.log(keys);
//     if(err) return console.log(err);
// })