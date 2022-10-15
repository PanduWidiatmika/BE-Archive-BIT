module.exports = (express, con, authenticateToken) => {
    var cors = require("cors");
    var bcrypt = require("bcrypt");
    const bodyParser = require("body-parser");
    const jwt = require("jsonwebtoken");
    const dotenv = require("dotenv");
    dotenv.config();
    process.env.TOKEN_SECRET;
    var nodemailer = require("nodemailer");
    const app = express.Router()

    let smtpConfig = {
        service: "hotmail",
        auth: {
            user: process.env.USER,
            pass: process.env.PASSWORD,
        },
    };

    var transporter = nodemailer.createTransport(smtpConfig);

    app.use(cors());
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(bodyParser.json());

    //generate jwt
    function generateAccessToken(username) {
        return jwt.sign(username, process.env.TOKEN_SECRET, { expiresIn: "1d" });
    }

    //send email
    app.post("/send", async function (req, res) {
        con.query("UPDATE users SET is_locked = ? WHERE id_user = ?", [req.body.is_locked, req.body.id], function (err, result, fields) {
            if (err) {
                throw err;
            } else {
                con.query("SELECT * FROM verification WHERE id_user = ?", [req.body.id], function (err, result, fields) {
                    if (result.length > 0) {
                        if (result[0].id_user === req.body.id) {
                            con.query("DELETE FROM verification WHERE id_user = ?", [req.body.id], function (err, result, fields) {
                                if (err) throw err;
                                con.query("INSERT INTO verification(verif_code, id_user) VALUES(?,?)", [req.body.verif_code, req.body.id], function (err, result, fields) {
                                    if (err) throw err;
                                    con.query("SELECT * FROM users WHERE id_user = ?", [req.body.id], function (err, result, fields) {
                                        if (err) throw err;
                                        let mailOptions = {
                                            from: process.env.USER,
                                            to: result[0].user_email,
                                            subject: "Reset Password",
                                            text: "The Following is Your OTP Code: \n" + req.body.verif_code + "\nPlease insert your OTP Code on this following link: \n" + `http://localhost:3001/#/insertVerifCode?email=${result[0].user_email}`,
                                        };

                                        transporter.sendMail(mailOptions, function (err, data) {
                                            if (err) {
                                                console.log("Error " + err);
                                            } else {
                                                console.log("Email sent successfully");
                                                res.json({ status: "Email sent" });
                                            }
                                        });
                                    });
                                });
                            });
                        } else {
                            throw err;
                        }
                    } else if (!result.length > 0) {
                        con.query("INSERT INTO verification(verif_code, id_user) VALUES(?,?)", [req.body.verif_code, req.body.id], function (err, result, fields) {
                            if (err) throw err;
                            con.query("SELECT * FROM users WHERE id_user = ?", [req.body.id], function (err, result, fields) {
                                if (err) throw err;
                                let mailOptions = {
                                    from: process.env.USER,
                                    to: result[0].user_email,
                                    subject: "Reset Password",
                                    text: "The Following is Your OTP Code: \n" + req.body.verif_code + "\nPlease insert your OTP Code on this following link: \n" + `http://localhost:3001/#/insertVerifCode?email=${result[0].user_email}`,
                                };

                                transporter.sendMail(mailOptions, function (err, data) {
                                    if (err) {
                                        console.log("Error " + err);
                                    } else {
                                        console.log("Email sent successfully");
                                        res.json({ status: "Email sent" });
                                    }
                                });
                            });
                        });
                    } else {
                        res.send({ message: "ERROR" } + err);
                    }
                });
            }
        });
    });

    //cek OTP
    app.post("/cekOtp", (req, res) => {
        con.query("SELECT * FROM users WHERE user_email = ?", [req.body.user_email], function (err, result, fields) {
            if (err) {
                throw err;
            } else {
                if (!result.length > 0) {
                    res.send({ message: "Email not found!" });
                } else if (req.body.user_email !== req.body.params_user_email) {
                    res.send({ message: "Invalid Email!" });
                } else {
                    var id = result[0].id_user;
                    con.query("SELECT * FROM verification where id_user = ? AND verif_code = ?", [id, req.body.verif_code], function (err, result, fields) {
                        if (!result.length > 0) {
                            res.send({ message: "Verification Code Not Valid or Not Found!" });
                        } else if (result.length > 0) {
                            res.send(result);
                        } else {
                            throw err;
                        }
                    });
                }
            }
        });
    });

    //change password
    app.put("/changePassword", (req, res) => {
        con.query("SELECT * FROM users WHERE user_email = ?", [req.body.params_user_email], function (err, result, fields) {
            if (err) throw err;
            const id = result[0].id_user;
            con.query("SELECT * FROM verification WHERE id_user = ?", [id], function (err, result, fields) {
                if (err) {
                    throw err;
                } else if (result.length > 0) {
                    con.query("UPDATE users SET user_password = ?, is_locked = ? WHERE id_user = ?", [(req.body.user_password = bcrypt.hashSync(req.body.user_password, 10)), req.body.is_locked, id], function (err, result, fields) {
                        if (err) throw err;
                        con.query("DELETE FROM verification WHERE id_user = ?", [id], function (err, result, fields) {
                            if (err) throw err;
                            res.send({ success: "Password Updated!" });
                        });
                    });
                } else {
                    res.send({ failed: "Not allowed!" });
                }
            });
        });
    });

    //testing
    app.get("/", (req, res) => {
        res.send("test");
    });

    //get all users
    app.post("/get", authenticateToken, (req, res) => {
        con.query("SELECT * FROM users JOIN roles using (id_role)", function (err, result, fields) {
            if (err) throw err;
            res.send(result);
        });
    });

    //get 1 users based on id on params
    app.post(`/getOne/:id`, authenticateToken, (req, res) => {
        con.query("SELECT * FROM users JOIN roles using (id_role) WHERE id_user = ?", [req.params.id], function (err, result, fields) {
            if (err) throw err;
            res.send(result);
        });
    });

    //insert user
    app.post("/insert", authenticateToken, (req, res) => {
        con.query(
            "INSERT INTO users(first_name, last_name, user_email, user_password) VALUES(?,?,?,?)", [req.body.first_name, req.body.last_name, req.body.user_email, (req.body.user_password = bcrypt.hashSync(req.body.user_password, 10))], function (err, result, fields) {
                if (err) throw err;
                res.send(result);
            }
        );
    });

    //update user
    app.put("/update", authenticateToken, (req, res) => {
        con.query("UPDATE users SET first_name = ?, last_name = ?, user_email = ? WHERE id_user = ?", [req.body.first_name, req.body.last_name, req.body.user_email, req.body.id], function (err, result, fields) {
            if (err) throw err;
            res.send(result);
        });
    });

    //delete user
    app.delete("/delete", (req, res) => {
        con.query("DELETE FROM users WHERE id_user = ?", [req.body.id], function (err, result, fields) {
            if (err) throw err;
            res.send({ message: "Delete Success!" });
        });
    });

    //login
    app.post("/login", (req, res) => {
        con.query("SELECT * FROM users where user_email = ?", [req.body.user_email], async function (err, result, fields) {
            if (err) {
                throw err;
            } else {
                if (!result.length > 0) {
                    res.send({ message: "Email not found!" });
                } else {
                    if (!req.body.user_password) {
                        res.send({ message: "Please enter Password!" });
                    } else {
                        if (await bcrypt.compare(req.body.user_password, result[0].user_password)) {
                            req.session.loggedin = true;
                            req.session.username = result[0].first_name + " " + result[0].last_name;
                            req.session.roleId = result[0].id_role;
                            req.session.isLocked = result[0].is_locked;
                            req.session.userId = result[0].id_user;
                            const token = generateAccessToken({
                                uid: req.session.userId,
                                urn: req.session.username,
                                rid: req.session.roleId,
                                ilc: req.session.isLocked,
                            });
                            res.send(JSON.stringify(token));
                        } else {
                            res.send({ message: "Login Failed!" });
                        }
                    }
                }
            }
        });
    });

    //get id role
    app.post("/getIdRole", authenticateToken, (req, res) => {
        con.query("SELECT id_user, id_role FROM users WHERE user_email = ?", [req.body.user_email], function (err, result, fields) {
            if (err) throw err;
            res.send(result);
        });
    });

    //testing auth buat thunderclient
    app.get("/home", authenticateToken, (req, res) => {
        if (req.session.loggedin) {
            res.send({ success: "Selamat Datang, " + req.session.username + "!" });
        } else {
            res.send({ failed: "Login terlebih dahulu!" });
        }
        res.end();
    });

    //search user
    app.post("/searchUsers", authenticateToken, (req, res) => {
        con.query("SELECT u.first_name, u.last_name, u.user_email, r.id_role, r.nama_role FROM users u LEFT JOIN roles r ON (u.id_role = r.id_role) WHERE u.first_name LIKE ? OR u.last_name LIKE ?", [`%${req.body.first_name}%`, `%${req.body.last_name}%`], function (err, search_results) {
            if (err) throw err;
            res.send({ search_results });
        });
    })

    //
    app.post("/countUser", authenticateToken, (req, res) => {
        con.query("SELECT COUNT(id_user) as users_count from users WHERE id_role != 0", function (err, result, fields) {
            if (err) throw err;
            res.send(result)
        })
    })

    return app
}