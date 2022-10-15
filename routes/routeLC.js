var bodyParser = require("body-parser");

module.exports = (express, con, authenticateToken) => {
    const app = express.Router();

    // create application/json parser
    var jsonParser = bodyParser.json();

    // ROUTE USERS
    //NEW USER REGISTER
    app.post("/insert-user", jsonParser, authenticateToken, function (req, res) {
        const username = req.body.username;
        const full_name = req.body.full_name;

        con.query("INSERT INTO users (username, full_name) VALUES (?,?)", [username, full_name], (err, result) => {
            if (err) {
                throw err;
            } else {
                res.send({ message: "User Registered" });
            }
        });
    });

    //EXISTING USER LOGIN
    app.post("/loginID", jsonParser, authenticateToken, (req, res) => {
        const id_user = req.body.id_user;
        con.query("SELECT * FROM users WHERE id_user = ? ", [id_user], (err, result) => {
            if (err) {
                throw err;
            } else {
                res.send({ result });
            }
        });
    });

    app.post("/get-user", authenticateToken, (req, res) => {
        con.query("select * from users", function (err, result) {
            if (err) {
                throw err;
            } else {
                res.send({ result });
            }
        });
    });

    //ROUTE TABLE Rooms
    app.post("/insert-room", jsonParser, authenticateToken, (req, res) => {
        const room = req.body.room;
        const username = req.body.username;
        const message = req.body.message;
        const time = req.body.time;

        con.query("INSERT INTO rooms (room, username, message, time) values(?, ?, ?, ?)", [room, username, message, time], (err, result) => {
            if (err) throw err;
            res.send({ message: "Successfuly Insert Room" });
        });
    });

    app.post("/get-room", authenticateToken, (req, res) => {
        con.query("select * from rooms", function (err, result) {
            if (err) throw err;
            res.send({ result });
        });
    });

    app.post("/get-messages", authenticateToken, (req, res) => {
        con.query("select * from rooms where room = ?", [req.query.room], function (err, result) {
            if (err) throw err;
            res.send({ result });
        });
    });

    //route table primary_room
    app.post("/create-room", jsonParser, authenticateToken, (req, res) => {
        const name_room = req.body.name_room;

        con.query("INSERT INTO primary_room (name_room) values(?)", [name_room], (err, result) => {
            if (err) throw err;
            res.send({ message: "Successfuly Create Primary Room" });
        });
    });

    app.post("/get-primaryroom", authenticateToken, (req, res) => {
        con.query("select * from primary_room", [req.query.primary_room], function (err, result) {
            if (err) throw err;
            res.send({ result });
        });
    });

    app.post("/loginRooms", jsonParser, authenticateToken, (req, res) => {
        const id = req.body.id;
        con.query("select * from primary_room where id = ?", [id], (err, result) => {
            if (err) {
                throw err;
            } else {
                res.send({ result });
            }
        });
    });

    return app
};
