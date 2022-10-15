module.exports = (express) => {

  const app = express.Router()

  const mysql = require('mysql')

  //** START REGION DB INITILIZATION **
  const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
  });

  db.query("CREATE DATABASE if not exists bit_archive", function (err, result) {
    if (err) throw err;

    const con = mysql.createConnection({
      host: "localhost",
      user: "root",
      password: "",
      database: "bit_archive",
      multipleStatements: true
    });

    con.query(
      `
        CREATE TABLE if not exists roles(
          id_role INT AUTO_INCREMENT PRIMARY KEY,
          nama_role VARCHAR(255) UNIQUE NOT NULL
        );
        
        CREATE TABLE if not exists users(
          id_user INT AUTO_INCREMENT PRIMARY KEY,
          first_name VARCHAR(255) NOT NULL,
          last_name VARCHAR(255) NOT NULL,
          user_email VARCHAR(255) UNIQUE NOT NULL,
          user_password VARCHAR(255) NOT NULL,
          id_role INT DEFAULT TRUE NOT NULL,
          is_locked BOOLEAN DEFAULT FALSE NOT NULL,
          FOREIGN KEY(id_role) REFERENCES roles(id_role)
        );

        CREATE TABLE if not exists verification(
          id_verif INT AUTO_INCREMENT PRIMARY KEY,
          verif_code VARCHAR(255) UNIQUE NOT NULL,
          id_user INT NOT NULL,
          FOREIGN KEY(id_user) REFERENCES users(id_user)
        );

        CREATE TABLE if not exists categories(
          id_category INT AUTO_INCREMENT PRIMARY KEY,
          category_name VARCHAR(25) UNIQUE NOT NULL,
          category_status BOOLEAN DEFAULT TRUE
        );
          
        CREATE TABLE if not exists events(
          id INT AUTO_INCREMENT PRIMARY KEY,
          title VARCHAR(25) NOT NULL,
          description VARCHAR(255),
          id_category INT NOT NULL,
          FOREIGN KEY(id_category) REFERENCES categories(id_category),
          location VARCHAR(25),
          start timestamp DEFAULT current_timestamp NOT NULL,
          end timestamp DEFAULT current_timestamp NOT NULL,
          completed_at timestamp NULL,
          status BOOLEAN
        );
          
        CREATE TABLE if not exists archives(
          archive_id INT AUTO_INCREMENT PRIMARY KEY,
          archive_type VARCHAR(16) UNIQUE NOT NULL,
          archive_created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          archive_updated_at TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP
        );
  
        CREATE TABLE if not exists files(
          file_id INT AUTO_INCREMENT PRIMARY KEY,
          archive_type INT NOT NULL,
          FOREIGN KEY(archive_type) REFERENCES archives(archive_id),
          file_name VARCHAR(32) UNIQUE NOT NULL,
          file_description VARCHAR(64),
          file_path VARCHAR(128) UNIQUE NOT NULL,
          file_created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          file_updated_at TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP
        );
  
        CREATE TABLE if not exists status(
          status_id INT AUTO_INCREMENT PRIMARY KEY,
          status_title VARCHAR(255) UNIQUE
        );
  
        CREATE TABLE if not exists ticket(
          ticket_id INT AUTO_INCREMENT PRIMARY KEY,
          ticket_name_client VARCHAR(255) NOT NULL,
          ticket_title VARCHAR(255) NOT NULL,
          ticket_description VARCHAR(255) NOT NULL,
          ticket_status INT,
          FOREIGN KEY(ticket_status) REFERENCES status(status_id),
          created_at TIMESTAMP  DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP
        );
          
        CREATE TABLE if not exists module(
          module_id INT AUTO_INCREMENT PRIMARY KEY,
          ticket_id INT,
          FOREIGN KEY(ticket_id) REFERENCES ticket(ticket_id),
          module_name VARCHAR(255) NOT NULL,
          module_status INT DEFAULT FALSE
        );
  
        CREATE TABLE if not exists primary_room(
          id INT AUTO_INCREMENT PRIMARY KEY,
          name_room VARCHAR(64) UNIQUE NOT NULL
        );
        
        CREATE TABLE if not exists Rooms(
          id INT AUTO_INCREMENT PRIMARY KEY,
          room VARCHAR(64) NOT NULL,
          FOREIGN KEY(room) REFERENCES primary_room(name_room),
          username VARCHAR(32) NOT NULL,
          message VARCHAR(255),
          time VARCHAR(16) NOT NULL
        );

        INSERT INTO roles (id_role,nama_role) SELECT * FROM (SELECT 1, 'admin') AS tmp WHERE NOT EXISTS ( SELECT nama_role FROM roles WHERE nama_role = 'admin' ) LIMIT 1;
        UPDATE roles SET id_role = 0 WHERE nama_role = "admin";
        INSERT INTO roles (id_role,nama_role) SELECT * FROM (SELECT 1, 'user') AS tmp WHERE NOT EXISTS ( SELECT nama_role FROM roles WHERE nama_role = 'user' ) LIMIT 1;

        INSERT INTO users (id_user, first_name, last_name, user_email, user_password, id_role) SELECT * FROM (SELECT 1, "bit", "admin", "bitteam2022@gmail.com", "$2a$12$Sees/Omt.EVv37dLZJ3fLuqhKYogpXvjnUCxeHMS0QMCjn5Qci9by", 0) AS tmp WHERE NOT EXISTS ( SELECT id_role FROM users WHERE id_role = 0 ) LIMIT 1;

        INSERT INTO status (status_title) 
          SELECT * FROM (SELECT 'Belum Mulai') AS tmp WHERE NOT EXISTS ( SELECT status_title FROM status WHERE status_title = 'Belum Mulai' ) LIMIT 1;
        INSERT INTO status (status_title) 
          SELECT * FROM (SELECT 'Sedang Dikerjakan') AS tmp WHERE NOT EXISTS ( SELECT status_title FROM status WHERE status_title = 'Sedang Dikerjakan' ) LIMIT 1;
        INSERT INTO status (status_title) 
          SELECT * FROM (SELECT 'Selesai') AS tmp WHERE NOT EXISTS ( SELECT status_title FROM status WHERE status_title = 'Selesai' ) LIMIT 1;
        INSERT INTO status (status_title) 
          SELECT * FROM (SELECT 'Tertunda') AS tmp WHERE NOT EXISTS ( SELECT status_title FROM status WHERE status_title = 'Tertunda' ) LIMIT 1;
        INSERT INTO status (status_title) 
          SELECT * FROM (SELECT 'Batal') AS tmp WHERE NOT EXISTS ( SELECT status_title FROM status WHERE status_title = 'Batal' ) LIMIT 1;

        INSERT INTO categories (category_name) 
          SELECT * FROM (SELECT 'Meeting') AS tmp WHERE NOT EXISTS ( SELECT category_name FROM categories WHERE category_name = 'Meeting' ) LIMIT 1;
        INSERT INTO categories (category_name) 
          SELECT * FROM (SELECT 'Trip') AS tmp WHERE NOT EXISTS ( SELECT category_name FROM categories WHERE category_name = 'Trip' ) LIMIT 1;
      `,
      function (err, result) {
        if (err) throw err;
        console.log("Database Ready");
      }
    );

    //** END REGION DB INITILIZATION **
    con.end()
  });

  return app;
}