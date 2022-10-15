//Import
const express = require('express')
const mysql = require('mysql')
const bodyParser = require('body-parser')
const http = require('http')
const session = require("express-session");
const jwt = require("jsonwebtoken");
const cors = require("cors");

//Server dependencies
const app = express()
const port = 8082

//Express dependencies
app.use(cors(), express.json({ limit: "200mb" }), express.urlencoded({ limit: "200mb", extended: true }));
app.use(bodyParser.json())
app.use(
  session({
    secret: "secret",
    resave: true,
    saveUninitialized: true,
  })
);

//Socket.io port using
const io = require("socket.io")(3002, {
  cors: {
    origin: "http://localhost:3001",
  },
});

//Create DB
app.use(require('./db/dbConnector')(express))

//** START REGION DB INITILIZATION **
const con = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "bit_archive",
});

//Auth
function authenticateToken(req, res, next) {
  let token = req.body.token;

  if (!token) {
    return res.status(403).send({
      message: "No token provided!",
    });
  }

  jwt.verify(token, process.env.TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({
        message: "Unauthorized!",
      });
    }
    req.userId = decoded.id;
    next();
  });
}

//API endpoint
app.use(require('./routes/routeFM')(express, con, authenticateToken)) //routeFM as route File Management
app.use(require('./routes/routeTM')(express, con, authenticateToken)) //routeTM as route Ticket Management
app.use(require('./routes/routeUM')(express, con, authenticateToken)) //routeUM as route User Management
app.use(require('./routes/routeEM')(express, con, authenticateToken)) //routeEM as route Event Management
app.use(require('./routes/routeLC')(express, con, authenticateToken)) //routeLC as route Live Chat (socket.io)

// Connector socket.io
io.on("connection", (socket) => {
  console.log(`User Connected: ${socket.id}`);

  socket.on("join_room", (username, data) => {
    socket.join(data);
    console.log(`Username: ${username} with ID Socket: ${socket.id} Joined Room: ${data}`);
  });

  socket.on("leave_room", (username, data) => {
    socket.leave(data);
    console.log(`Username: ${username} with ID Socket: ${socket.id} Leaved Room: ${data}`);
  })

  socket.on("send_message", (data) => {
    socket.to(data.room).emit("receive_message", data);
  });

  socket.on("disconnect", () => {
    console.log("User Disconnect", socket.id);
  });
});

// Building server
http.createServer(app)
  .listen(port, function (err) {
    if (err) {
      console.log(err)
      process.exit(1)
    }
    console.log(`Server listening at ${port}`)
  })