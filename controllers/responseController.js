const db = require("../config/db");


// ===============================
// Insert Response Result
// ===============================
exports.insertResponse = (req, res) => {
  const { responce_results, status } = req.body;

  if (!responce_results || responce_results.trim() === "") {
    return res.status(400).json({
      status: 400,
      success: false,
      message: "Response result is required"
    });
  }

  const sql = `
    INSERT INTO ai_responce 
    (responce_results,status) 
    VALUES (?,?)
  `;

  db.query(
    sql,
    [
      responce_results,
      status || 1
    ],
    (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({
          status: 500,
          success: false,
          message: "Database error"
        });
      }

      res.status(200).json({
        status: 200,
        success: true,
        insertedId: result.insertId
      });
    }
    );
};



// ===============================
// Get All Response Results
// ===============================
exports.getAllResponses = (req, res) => {
  const sql = `
    SELECT id, responce_results, date_time 
    FROM ai_responce 
    WHERE status = 1
    ORDER BY id DESC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({
        status: 500,
        success: false,
        message: "Database error"
      });
    }

    res.status(200).json({
      status: 200,
      success: true,
      data: results
    });
  });
};



// ===============================
// Get Response By ID
// ===============================
exports.getResponseById = (req, res) => {
  const id = req.params.id;

  const sql = `
    SELECT id, responce_results, date_time 
    FROM ai_responce 
    WHERE id = ? AND status = 1
  `;

  db.query(sql, [id], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({
        status: 500,
        success: false,
        message: "Database error"
      });
    }

    if (results.length === 0) {
      return res.status(404).json({
        status: 404,
        success: false,
        message: "Record not found"
      });
    }

    res.status(200).json({
      status: 200,
      success: true,
      data: results[0]
    });
  });
};
