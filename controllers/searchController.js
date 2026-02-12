const db = require("../config/db");

// ===============================
// Insert Record
// ===============================
exports.insertSearchParams = (req, res) => {
  const { fullname, companyName, role, email_address, responce_results, status } = req.body;

  // Validation
  if (!fullname || fullname.trim() === "") {
    return res.status(400).json({
      success: false,
      message: "Full name is required"
    });
  }

  if (!companyName || companyName.trim() === "") {
    return res.status(400).json({
      success: false,
      message: "Company name is required"
    });
  }

  if (!responce_results || responce_results.trim() === "") {
    return res.status(400).json({
      success: false,
      message: "Response result is required"
    });
  }

  // Step 1: Insert into searchparams table
  const searchSql = `
    INSERT INTO searchparams 
    (fullname, companyName, role, email_address, status) 
    VALUES (?, ?, ?, ?, ?)
  `;

  db.query(
    searchSql,
    [
      fullname,
      companyName,
      role || "",
      email_address || "",
      status || 1
    ],
    (err, result) => {
      if (err) {
        console.error("Search insertion error:", err);
        return res.status(500).json({
          status: 500,
          success: false,
          message: "Database error while inserting search params",
          error: err.message
        });
      }

      const searchParamId = result.insertId;

      // Step 2: Insert responce_results into ai_responce table
      const responseSql = `
        INSERT INTO ai_responce 
        (search_id, responce_results, status) 
        VALUES (?, ?, ?)
      `;

      db.query(
        responseSql,
        [searchParamId, responce_results, status || 1],
        (err, responseResult) => {
          if (err) {
            console.error("Response insertion error:", err);
            return res.status(500).json({
              status: 500,
              success: false,
              message: "Database error while inserting response",
              error: err.message
            });
          }

          res.status(200).json({
            status: 200,
            success: true,
            searchParamId: searchParamId,
            responseId: responseResult.insertId
          });
        }
      );
    }
  );
};


// ===============================
// Get All Records
// ===============================
exports.getSearchParams = (req, res) => {
  const sql = `
    SELECT id, fullname, companyName, role, email_address 
    FROM searchparams 
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

    const formattedData = results.map(row => ({
      id: row.id,
      name: row.fullname,
      companyName: row.companyName,
      role: row.role,
      response: row.responce_results,
      email: row.email_address
    }));

    res.status(200).json({
      status: 200,
      success: true,
      data: formattedData
    });
  });
};



// ===============================
// Get Record By ID
// ===============================
exports.getSearchParamById = (req, res) => {
  const id = req.params.id;

  const sql = `
    SELECT fullname, companyName, role, email_address
    FROM searchparams 
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

    const row = results[0];

    res.status(200).json({
      status: 200,
      success: true,
      data: {
        name: row.fullname,
        companyName: row.companyName,
        role: row.role,
        email: row.email_address
        
      }
    });
  });
};
