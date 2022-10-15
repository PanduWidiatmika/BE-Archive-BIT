module.exports = (express, con, authenticateToken) => {
    const nodemailer = require("nodemailer");
    const cron = require('node-cron');
    const app = express.Router()

    cron.schedule('0 0 0 * * *', async (req, res) => {
        con.query(
            "SELECT title FROM events WHERE TIMESTAMPDIFF(DAY, CURRENT_DATE, end)<3 AND (CURRENT_DATE BETWEEN DATE_FORMAT(start, '%Y-%m-%d') AND DATE_FORMAT(end, '%Y-%m-%d')) AND status=0;",
            [],
            function (err, result) {
                if (err)
                    throw err;
                if (result.length > 0) {
                    var arrayTitle = []

                    for (i = 0; result.length > i; i++) {
                        arrayTitle.push(result[i].title)
                    }
                    //================
                    var arrayUsers = []

                    con.query("SELECT user_email FROM users", [], function (err, result) {

                        for (i = 0; result.length > i; i++) {
                            arrayUsers.push(result[i].user_email)
                        }

                        let transporter = nodemailer.createTransport({
                            service: "hotmail",
                            auth: {
                                user: process.env.USER,
                                pass: process.env.PASSWORD,
                            },
                        });

                        let mailOptions = {
                            from: process.env.USER,
                            to: arrayUsers.join(", "),
                            subject: "Event Reminder",
                            text: `Hello User, you have ${result.length} events that close to deadline: ${arrayTitle.join(", ")}`,
                        };

                        transporter.sendMail(mailOptions, function (err, data) {
                            if (err) {
                                console.log("Error " + err);
                            } else {
                                console.log("Email sent successfully");
                                res.json({ status: "Email sent" });
                            }
                        });
                    })
                }
            })
    });

    app.post('/getEvent', authenticateToken, (req, rep) => {
        con.query(
            "SELECT * FROM events",
            [],
            function (err, result) {
                if (err)
                    throw err;

                return rep.status(200).send(result)
            }
        )
    })

    app.post('/getCategories', authenticateToken, (req, rep) => {
        con.query(
            "SELECT c.id_category, c.category_name, c.category_status, COUNT(e.title) AS jumlah_event FROM categories c LEFT JOIN events e ON (c.id_category=e.id_category) GROUP BY c.id_category",
            [],
            function (err, result) {
                if (err)
                    throw err;

                return rep.status(200).send(result)
            }
        )
    })

    app.post('/todayEventData', authenticateToken, (req, rep) => {
        con.query(
            "SELECT *, TIMESTAMPDIFF(DAY, CURRENT_TIMESTAMP, end) AS deadline FROM events WHERE (CURRENT_DATE >= DATE_FORMAT(start, '%Y-%m-%d') AND CURRENT_TIMESTAMP<=end) AND status=0",
            [],
            function (err, result) {
                if (err)
                    throw err;

                return rep.status(200).send(result)
            }
        )
    })

    app.post('/statusEventData', authenticateToken, (req, rep) => {
        con.query(
            "SELECT e.id, e.title, e.location, e.start, e.end, e.status, c.category_name FROM events e JOIN categories c ON (e.id_category=c.id_category) WHERE e.status=0 AND CURRENT_TIMESTAMP > e.end ORDER BY e.start ASC",
            [],
            function (err, result) {
                if (err)
                    throw err;

                return rep.status(200).send(result)
            }
        )
    })

    app.post('/findEvent', authenticateToken, (req, rep) => {
        con.query(
            "SELECT * FROM events WHERE id = ?",
            [
                req.query.id,
            ],
            function (err, result) {
                if (err)
                    throw err;

                rep.status(200).send(result)
            }
        )
    })

    app.post('/findCategory', authenticateToken, (req, rep) => {
        con.query(
            "SELECT * FROM categories WHERE id_category = ?",
            [
                req.query.id,
            ],
            function (err, result) {
                if (err)
                    throw err;

                rep.status(200).send(result)
            }
        )
    })

    app.post('/insertEvent', authenticateToken, (req, rep) => {
        con.query(
            "insert into events(title, description, id_category, location, start, end, status) values(?, ?, ?, ?, ?, ?, ?)",
            [
                req.body.title,
                req.body.description,
                req.body.category,
                req.body.location,
                req.body.start,
                req.body.end,
                0
            ],
            function (err, result) {
                if (err)
                    throw err;

                rep.status(200).send(result)
            }
        )
    })

    app.post('/insertCategory', authenticateToken, (req, rep) => {
        con.query(
            "SELECT * FROM categories WHERE category_name LIKE ?",
            [
                `%${req.body.category_name}%`,
            ],
            function (err, result) {
                if (err)
                    throw err;

                if (!result[0]) {
                    con.query(
                        "insert into categories(category_name) values(?)",
                        [
                            req.body.category_name,
                        ],
                        function (err, result) {
                            if (err)
                                throw err;

                            rep.status(200).send({ message: "Insert Category Success!" })
                        }
                    )
                } else {
                    rep.status(200).send({ message: "Similar Name Detected" })
                }
            }
        )

    })

    app.put('/updateEvent', authenticateToken, (req, rep) => {
        con.query(
            "UPDATE events SET title = ?, description = ?, id_category = ?, location = ?, start = ?, end = ?, status = ? WHERE id = ?",
            [
                req.body.title,
                req.body.description,
                req.body.category,
                req.body.location,
                req.body.start,
                req.body.end,
                req.body.status,
                req.body.id
            ],
            function (err, result) {
                if (err)
                    throw err;

                if (req.body.status) {
                    con.query("UPDATE events SET completed_at = CURRENT_TIMESTAMP WHERE id = ?",
                        [req.body.id]
                    )
                }

                if (result.affectedRows === 0) {
                    rep.status(200).send({ message: "Data is empty" })
                } else if (result.affectedRows === 1) {
                    rep.status(200).send({ message: "Edit Success" })
                } else {
                    rep.status(400).send({ message: "Something Might Gone Wrong" })
                }
            }
        )
    })

    app.put('/updateCategory', authenticateToken, (req, rep) => {
        con.query(
            "UPDATE categories SET category_name = ?, category_status = ? WHERE id_category = ?",
            [
                req.body.category_name,
                req.body.status,
                req.body.id,
            ],
            function (err, result) {
                if (err)
                    throw err;

                if (result.affectedRows === 0) {
                    rep.status(200).send({ message: "Data is empty" })
                } else if (result.affectedRows === 1) {
                    rep.status(200).send({ message: "Edit Success" })
                } else {
                    rep.status(400).send({ message: "Something Might Gone Wrong" })
                }
            }
        )
    })

    app.delete('/deleteEvent', authenticateToken, (req, rep) => {
        con.query(
            "DELETE FROM events WHERE id=?",
            [
                req.body.id,
            ],
            function (err, result) {
                if (err)
                    throw err;

                if (result.affectedRows === 0) {
                    rep.status(200).send({ message: "Data is empty" })
                } else if (result.affectedRows === 1) {
                    rep.status(200).send({ message: "Delete Success" })
                } else {
                    rep.status(400).send({ message: "Something Might Gone Wrong" })
                }
            }
        )
    })

    app.delete('/deleteCategory', authenticateToken, (req, rep) => {
        con.query(
            (
                req.body.status ?
                    "UPDATE categories SET category_status=0 WHERE id_category=?"
                    :
                    "SELECT * FROM categories c JOIN events e ON (e.id_category=c.id_category) WHERE c.id_category=?"
            ),
            [
                req.body.id,
            ],
            function (err, result) {
                if (err)
                    throw err;

                if (req.body.status) {
                    if (result.affectedRows === 0) {
                        rep.status(200).send({ message: "Data is empty" })
                    } else if (result.affectedRows === 1) {
                        rep.status(200).send({ message: "Status Success Changed" })
                    } else {
                        rep.status(400).send({ message: "Something Might Gone Wrong" })
                    }
                } else {
                    if (result.length > 0) {
                        rep.status(200).send({ error: "This Category has been used, please delete existing event with this category to proceed" })
                    } else {
                        con.query("DELETE FROM categories WHERE id_category=?",
                            [req.body.id],
                            function (err, result) {
                                if (err)
                                    throw err;

                                if (result.affectedRows === 0) {
                                    rep.status(200).send({ message: "Data is empty" })
                                } else if (result.affectedRows === 1) {
                                    rep.status(200).send({ message: "Delete Success" })
                                } else {
                                    rep.status(400).send({ message: "Something Might Gone Wrong" })
                                }
                            })
                    }
                }
            }
        )
    })

    return app
}