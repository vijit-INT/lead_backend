const db = require("../config/db");

exports.getDashboardStats = (req, res) => {
  const totalLeadsSql = `
    SELECT COUNT(*) AS totalLeads 
    FROM searchparams 
    WHERE status = 1
  `;

  const enrichedSql = `
    SELECT COUNT(DISTINCT search_id) AS enrichedProfiles
    FROM ai_responce
    WHERE status = 1
  `;

  db.query(totalLeadsSql, (err, totalResult) => {
    if (err) {
      console.error("Dashboard stats error:", err);
      return res.status(500).json({
        status: 500,
        success: false,
        message: "Database error",
        error: err.message
      });
    }

    const totalLeads = totalResult[0].totalLeads;

    db.query(enrichedSql, (err, enrichedResult) => {
      if (err) {
        console.error("Dashboard stats error:", err);
        return res.status(500).json({
          status: 500,
          success: false,
          message: "Database error",
          error: err.message
        });
      }

      const enrichedProfiles = enrichedResult[0].enrichedProfiles;

      const conversionRate =
        totalLeads > 0
          ? ((enrichedProfiles / totalLeads) * 100).toFixed(2)
          : 0;

      res.status(200).json({
        status: 200,
        success: true,
        data: {
          totalLeads,
          enrichedProfiles,
          conversionRate: `${conversionRate}%`
        }
      });
    });
  });
};
