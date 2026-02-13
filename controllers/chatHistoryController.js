const db = require("../config/db");


// ===============================
// Insert Chat History
// ===============================
exports.insertChatHistory = (req, res) => {
  const { serach_id, chat_history } = req.body;

  // Validation
  if (!serach_id) {
    return res.status(400).json({
      status: 400,
      success: false,
      message: "serach_id is required"
    });
  }

  if (!chat_history) {
    return res.status(400).json({
      status: 400,
      success: false,
      message: "chat_history is required"
    });
  }

  // 1️⃣ Validate serach_id exists in searchparams
  const checkSearchSql = "SELECT id FROM searchparams WHERE id = ?";

  db.query(checkSearchSql, [serach_id], (err, searchResult) => {
    if (err) {
      return res.status(500).json({
        status: 500,
        success: false,
        message: "Database error"
      });
    }

    if (searchResult.length === 0) {
      return res.status(400).json({
        status: 400,
        success: false,
        message: "Invalid serach_id. Not found in searchparams."
      });
    }

    // 2️⃣ Check if chat history already exists
    const checkChatSql = "SELECT id FROM chathistory WHERE serach_id = ?";

    db.query(checkChatSql, [serach_id], (err, chatResult) => {
      if (err) {
        return res.status(500).json({
          status: 500,
          success: false,
          message: "Database error"
        });
      }

      // 🔁 UPDATE if exists
      if (chatResult.length > 0) {
        const updateSql = `
          UPDATE chathistory 
          SET chat_history = ?, date_time = CURRENT_TIMESTAMP
          WHERE serach_id = ?
        `;

        db.query(updateSql, [chat_history, serach_id], (err) => {
          if (err) {
            return res.status(500).json({
              status: 500,
              success: false,
              message: "Update failed"
            });
          }

          return res.status(200).json({
            status: 200,
            success: true,
            message: "Chat history updated successfully"
          });
        });
      } 
      // ➕ INSERT if not exists
      else {
        const insertSql = `
          INSERT INTO chathistory (serach_id, chat_history)
          VALUES (?, ?)
        `;

        db.query(insertSql, [serach_id, chat_history], (err, insertResult) => {
          if (err) {
            return res.status(500).json({
              status: 500,
              success: false,
              message: "Insert failed"
            });
          }

          return res.status(200).json({
            status: 200,
            success: true,
            insertedId: insertResult.insertId
          });
        });
      }
    });
  });
};




// ===============================
// Get All Chat History
// ===============================
exports.getAllChatHistory = (req, res) => {

  const sql = `
    SELECT c.id, c.serach_id, c.chat_history, c.date_time,
           s.fullname, s.companyName
    FROM chathistory c
    JOIN searchparams s ON s.id = c.serach_id
    ORDER BY c.id DESC
  `;

  db.query(sql, (err, results) => {
    if (err) {
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
// Get Chat History By ID
// ===============================
exports.getChatHistoryById = (req, res) => {
  const id = req.params.id;

  const sql = `
    SELECT c.id, c.serach_id, c.chat_history, c.date_time,
           s.fullname, s.companyName
    FROM chathistory c
    JOIN searchparams s ON s.id = c.serach_id
    WHERE c.id = ?
  `;

  db.query(sql, [id], (err, results) => {
    if (err) {
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
