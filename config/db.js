const mysql = require("mysql2");

// Using a pool is better for Express apps as it handles multiple connections and reconnections
// const pool = mysql.createPool({
//   host: "localhost",
//   user: "root",
//   password: "",
//   database: "again_hec_db",
//   waitForConnections: true,
//   connectionLimit: 10,
//   queueLimit: 0,
// });
const pool = mysql.createPool({
  host: "192.168.1.205",
  user: "lead_scoring_dev_db_user",
  password: "EeeQC29goGSV",
  database: "lead_scoring_dev_db",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Test the connection
pool.getConnection((err, connection) => {
  if (err) {
    if (err.code === "PROTOCOL_CONNECTION_LOST") {
      console.error("Database connection was closed.");
    }
    if (err.code === "ER_CON_COUNT_ERROR") {
      console.error("Database has too many connections.");
    }
    if (err.code === "ECONNREFUSED" || err.code === "ETIMEDOUT") {
      console.error(
        "Database connection was refused or timed out. Check host: 192.168.1.205",
      );
    }
    console.error("Database pool initialization failed:", err.message);
    return;
  }
  if (connection) {
    connection.release();
    console.log("Connected to MySQL via Pool");
  }
});

module.exports = pool;
