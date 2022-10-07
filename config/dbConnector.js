var mysql = require("mysql");

var con = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "user_management",
});

con.connect(function (err) {
  if (err) throw err;

  var sql = "CREATE TABLE";
  //Create Table role
  con.query("CREATE TABLE if not exists roles (\
    id_role INT AUTO_INCREMENT PRIMARY KEY, \
    nama_role VARCHAR(255) UNIQUE NOT NULL \
  )", function (err, result) {
    if (err) throw err;
    console.log("Roles Table Created");
  });

  //Create Table user
  con.query(
    "CREATE TABLE if not exists users (\
        id_user INT AUTO_INCREMENT PRIMARY KEY, \
        first_name VARCHAR(255) NOT NULL, \
        last_name VARCHAR(255) NOT NULL, \
        user_email VARCHAR(255) UNIQUE NOT NULL, \
        user_password VARCHAR(255) NOT NULL, \
        id_role INT NOT NULL, \
        is_locked BOOLEAN DEFAULT FALSE NOT NULL,\
        FOREIGN KEY (id_role) REFERENCES roles (id_role)\
      )",
    function (err, result) {
      if (err) throw err;
      console.log("Roles Users Created");
    }
  );

  con.query(
    "CREATE TABLE if not exists verification (\
        id_verif INT AUTO_INCREMENT PRIMARY KEY, \
        verif_code VARCHAR(255) UNIQUE NOT NULL, \
        id_user INT NOT NULL, \
        FOREIGN KEY (id_user) REFERENCES users (id_user)\
      )",
    function (err, result) {
      if (err) throw err;
      console.log("Roles Verification Created");
    }
  );
  console.log("Connected!");
  module.exports = con;
});

// module.exports = { dbConnector };
