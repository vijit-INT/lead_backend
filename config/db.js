const mysql = require("mysql2");

const db = mysql.createConnection({
  host: "192.168.1.205",
  user: "lead_scoring_dev_db_user",
  password: "EeeQC29goGSV",
  database: "lead_scoring_dev_db"
});

db.connect((err) => {
  if (err) {
    console.error("Database connection failed:", err);
    return;
  }
  console.log("Connected to MySQL");
});

module.exports = db;