const db = require("../config/db");

// ===============================
// Insert Record
// ===============================
exports.insertSearchParams = (req, res) => {
  const { fullname, companyName, role, email_address,requirement,budget, responce_results, status } = req.body;

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
  if (!requirement || requirement.trim() === "") {
    return res.status(400).json({
      success: false,
      message: "Requirement is required"
    });
  }
  if (!budget || budget.trim() === "") {
    return res.status(400).json({
      success: false,
      message: "Budget is required"
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
    (fullname, companyName, role, email_address, requirement, budget, status) 
    VALUES (?, ?, ?, ?, ?)
  `;

  db.query(
    searchSql,
    [
      fullname,
      companyName,
      role || "",
      email_address || "",
      requirement,
      budget,
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
    SELECT 
      s.id AS search_id,
      s.fullname,
      s.companyName,
      s.role,
      s.email_address,
      s.requirement,
      s.budget,

      a.responce_results,
      c.chat_history,
      c.date_time AS chat_date_time

    FROM searchparams s

    LEFT JOIN ai_responce a 
      ON a.search_id = s.id

    LEFT JOIN chathistory c
      ON c.search_id = s.id

    WHERE s.status = 1
    ORDER BY s.id DESC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      return res.status(500).json({
        status: 500,
        success: false,
        message: "Database error"
      });
    }

    const data = results.map(row => ({
      search_id: row.search_id,
      name: row.fullname,
      companyName: row.companyName,
      role: row.role,
      email: row.email_address,
      requirement: row.requirement,
      budget: row.budget,
      responce_results: row.responce_results || null,
      chat_history: row.chat_history || null,
      chat_date_time: row.chat_date_time || null
    }));

    res.status(200).json({
      status: 200,
      success: true,
      data
    });
  });
};


// ======================================
// GET SEARCH PARAM BY SEARCH ID
// ======================================
exports.getSearchParamById = (req, res) => {
  const searchId = req.params.id;

  const sql = `
    SELECT 
      s.id AS search_id,
      s.fullname,
      s.companyName,
      s.role,
      s.email_address,
      s.requirement,
      s.budget,

      a.responce_results,
      c.chat_history,
      c.date_time AS chat_date_time

    FROM searchparams s

    LEFT JOIN ai_responce a 
      ON a.search_id = s.id

    LEFT JOIN chathistory c
      ON c.search_id = s.id

    WHERE s.id = ? AND s.status = 1
  `;

  db.query(sql, [searchId], (err, results) => {
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

    const row = results[0];

    res.status(200).json({
      status: 200,
      success: true,
      data: {
        search_id: row.search_id,
        name: row.fullname,
        companyName: row.companyName,
        role: row.role,
        email: row.email_address,
        requirement: row.requirement,
        budget: row.budget,
        responce_results: row.responce_results || null,
        chat_history: row.chat_history || null,
        chat_date_time: row.chat_date_time || null
      }
    });
  });
};