// Import Library
var bodyParser = require('body-parser')

module.exports = (express, con, authenticateToken) => {
    const app = express.Router();

    // create application/json parser
    var jsonParser = bodyParser.json()

    // CRUD Table Status
    app.post('/get-status', authenticateToken, (req, rep) => {
        con.query('SELECT * FROM status ORDER BY status_id asc', function (err, result, fields) {
            if (err) throw err;
            rep.send({ result })
        })
    })

    app.post('/insert-status', jsonParser, authenticateToken, function (req, rep) {
        con.query('INSERT INTO status(status_title) values(?)',
            [
                req.body.status_title,
            ],
            function (err, result, fields) {
                if (err) throw err;
                rep.send({ message: "Insert Status Successful" })
            })
    })

    app.put('/update-status', jsonParser, authenticateToken, function (req, rep) {
        con.query('UPDATE status SET status_title = ? where status_id = ?',
            [
                req.body.status_title,
                req.body.status_id,
            ],
            function (err, result, fields) {
                if (err) throw err;
                rep.send({ message: "Update Status Successful" })
            })
    })

    app.delete('/delete-status', jsonParser, authenticateToken, function (req, rep) {
        con.query('DELETE from status where status_id = ?',
            [
                req.body.status_id,
            ],
            function (err, result, fields) {
                if (err) throw err;
                rep.send({ message: "Delete Status Successful" })
            })
    })

    // CRUD Table Ticket
    app.post('/get-ticket', authenticateToken, (req, rep) => {
        con.query('SELECT t.ticket_id, t.ticket_name_client, t.ticket_title, m.module_name, t.ticket_description, t.created_at, t.updated_at, s.status_title FROM ticket t LEFT JOIN status s ON (t.ticket_status = s.status_id) LEFT JOIN module m on (m.ticket_id = t.ticket_id) GROUP BY ticket_id ORDER BY t.ticket_id asc', function (err, result, fields) {
            if (err) throw err;
            rep.send({ result })
        })
    })

    app.post('/insert-ticket', jsonParser, authenticateToken, function (req, rep) {

        const q1 = `INSERT INTO ticket(ticket_title, ticket_description, ticket_status, ticket_name_client) values(?, ?, ?, ?)`
        const q2 = `SELECT ticket_id from ticket ORDER BY ticket_id DESC LIMIT 1`
        // const q2 = `SELECT last_insert_id()`
        const q3 = `INSERT INTO module(ticket_id, module_name) values((${q2}), ?)`

        const query = con.query(q1,
            [
                req.body.ticket_title,
                req.body.ticket_description,
                req.body.ticket_status,
                req.body.ticket_name_client,
            ])

        query
            .on('error', function (err) {
                console.log(err)
            })
            .on('end', function () {
                for (let i = 0; i < req.body.module_name.length; i++) {
                    con.query(q3,
                        [
                            req.body.module_name[i].formData,
                        ],
                        function (err, result, fields) {
                            if (err) throw err;
                        })
                }
                rep.send({ message: "Insert Successful" })

            });
    })

    app.put('/update-ticket', jsonParser, authenticateToken, function (req, rep) {

        const query = con.query('UPDATE ticket t LEFT JOIN module m ON (t.ticket_id = m.ticket_id) SET t.ticket_title = ?, t.ticket_name_client = ?, t.ticket_description = ?, t.ticket_status = ? where t.ticket_id = ?',
            [
                req.body.ticket_title,
                req.body.ticket_name_client,
                req.body.ticket_description,
                req.body.ticket_status,
                req.body.ticket_id,
            ])

        query
            .on('error', function (err) {
                console.log(err)
            })
            .on('end', function () {
                for (let i = 0; i < req.body.module.length; i++) {
                    con.query(`Update module SET module_name = ?, module_status = ? where module_id = ? `,
                        [
                            req.body.module[i].module_name,
                            req.body.module[i].module_status,
                            req.body.module[i].module_id,
                        ],
                        function (err, result, fields) {
                            if (err) throw err;
                        })
                }
                rep.send({ message: "Updated Successful" })

            });

    })

    app.delete('/delete-ticket', jsonParser, authenticateToken, function (req, rep) {
        const qdelMod = con.query('DELETE from module where ticket_id = ?',
            [
                req.body.ticket_id,
            ])

        qdelMod
            .on('error', function (err) {
                console.log(err)
            })
            .on('end', function () {
                con.query('DELETE from ticket where ticket_id = ?',
                    [
                        req.body.ticket_id,
                    ],
                    function (err, result, fields) {
                        if (err) throw err;
                        rep.send({ message: "Delete Successful" })
                    })
            });
    })

    app.post('/searchID-ticket', jsonParser, authenticateToken, function (req, rep) {
        con.query('SELECT ticket_id, ticket_title, ticket_name_client, ticket_description, ticket_status, created_at, updated_at, module_name from ticket LEFT JOIN module using (ticket_id) where ticket_id = ?',
            [
                req.body.ticket_id
            ],
            function (err, result, fields) {
                if (err) throw err;
                rep.send({ result })
            })
    })

    app.post('/viewId-ticket', jsonParser, authenticateToken, function (req, rep) {
        con.query('SELECT ticket_id, ticket_title, ticket_name_client, ticket_description, ticket_status, created_at, updated_at, module_id, module_name, module_status from ticket LEFT JOIN module using (ticket_id) where ticket_id = ?',
            [
                req.query.ticket_id
            ],
            function (err, result, fields) {
                if (err) throw err;
                rep.send({ result })
            })
    })

    app.post('/searchTitle-ticket', authenticateToken, function (req, rep) {
        con.query('select t.ticket_id, t.ticket_title, t.ticket_name_client, t.ticket_description, t.ticket_status, t.created_at, t.updated_at, m.module_name, s.status_title from ticket t LEFT JOIN module m ON (t.ticket_id = m.ticket_id) LEFT JOIN status s ON (t.ticket_status = s.status_id) where ticket_title like ? GROUP BY ticket_id',
            [
                `%${req.query.ticket_title}%`
            ],
            function (err, result, fields) {
                if (err) throw err;
                rep.send({ result })
            })
    })

    //TABLE MODULE
    app.post('/percent-module', jsonParser, authenticateToken, function (req, rep) {
        con.query('SELECT ROUND(AVG(module_status)*100,2) AS percent_module FROM module WHERE ticket_id = ?',
            [
                req.query.ticket_id
            ],
            function (err, result, fields) {
                if (err) throw err;
                rep.send({ result })
            })
    })

    app.post('/insert-module', jsonParser, authenticateToken, function (req, rep) {

        const q2 = `INSERT INTO module(ticket_id, module_name) VALUES (?, ?)`
        for (let i = 0; i < req.body.module_name.length; i++) {
            con.query(q2,
                [
                    req.body.ticket_id,
                    req.body.module_name[i].formData,
                ],
                function (err, result, fields) {
                    if (err) throw err;
                })
        }
        rep.send({ message: "Insert Module Successful" })
    })

    app.post('/total-ticket', authenticateToken, function (req, rep) {
        con.query('SELECT COUNT(ticket_id) AS total_ticket FROM ticket',
        function(err, result, fields) {
            if(err) throw err;
            rep.send({ result })
        })
    })

    return app
}

