var mysql = require("mysql");
const express = require("express");
var cors = require("cors");
var bcrypt = require("bcrypt");
const app = express();
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
const session = require("express-session");
const dotenv = require("dotenv");
dotenv.config();
process.env.TOKEN_SECRET;
var nodemailer = require("nodemailer");

var con = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "user_management",
});

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
app.use(
  session({
    secret: "secret",
    resave: true,
    saveUninitialized: true,
  })
);

//generate jwt
function generateAccessToken(username) {
  return jwt.sign(username, process.env.TOKEN_SECRET, { expiresIn: "1d" });
}

//auth
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
                    text: "Berikut adalah Kode OTP anda: \n" + req.body.verif_code + "\nSilahkan Masukkan Kode OTP tersebut ke link berikut: \n" + `http://localhost:3000/#/insertVerifCode?email=${result[0].user_email}`,
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
                text: "Berikut adalah Kode OTP anda: \n" + req.body.verif_code + "\nSilahkan Masukkan Kode OTP tersebut ke link berikut: \n" + `http://localhost:3000/#/insertVerifCode?email=${result[0].user_email}`,
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
    // console.log(result[0]);
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
    "INSERT INTO users(first_name, last_name, user_email, user_password) VALUES(?,?,?,?)",
    [req.body.first_name, req.body.last_name, req.body.user_email, (req.body.user_password = bcrypt.hashSync(req.body.user_password, 10))],
    function (err, result, fields) {
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
            const token = generateAccessToken({
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

// server listening
app.listen(8082, () => {
  console.log(`Server running on port ${8082}`);
});
