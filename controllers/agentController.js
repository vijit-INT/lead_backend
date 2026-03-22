const db = require("../config/db");
const {
  findLinkedInProfile,
  findCompanyLinkedIn,
  findCompanyWebsite,
  deepCompanySearch,
  deepPersonSearch,
} = require("../lib/search");
const { enrichProfile } = require("../lib/gemini");

/**
 * Main Agent API to start investigation
 * POST /api/agent
 */
exports.runAgent = async (req, res) => {
  const {
    name,
    role,
    email,
    mobile,
    companyName,
    companyUrl,
    requirement,
    budget,
  } = req.body;

  // Basic Validation
  if (!name || !companyName || !email || !requirement) {
    return res.status(400).json({
      status: 400,
      success: false,
      message:
        "Name, Company Name, Email, and Requirement are required fields.",
    });
  }

  // Set default budget if missing
  const finalBudget = budget && budget.trim() !== "" ? budget : "400000";

  try {
    console.log("🚀 Agent Investigation Started for:", name);

    // 1. Parallel Multi-Angle Intelligence Gathering
    const [
      userLinkedInCandidates,
      companyLinkedIn,
      companyWebsite,
      deepCompanyResults,
      deepPersonResults,
    ] = await Promise.all([
      findLinkedInProfile(name, companyName, role),
      findCompanyLinkedIn(companyName),
      findCompanyWebsite(companyName),
      deepCompanySearch(companyName),
      deepPersonSearch(name, companyName, role),
    ]);

    // Validation
    if (userLinkedInCandidates.length === 0 && !companyLinkedIn.url) {
      throw new Error(
        "No LinkedIn profile candidates or Company page found. Please check spelling or be more specific.",
      );
    }

    const searchData = {
      userLinkedInCandidates,
      companyLinkedIn,
      companyWebsite,
      deepCompanyResults,
      deepPersonResults,
    };

    // 2. Advanced AI Synthesis (Gemini)
    const userData = {
      name,
      role,
      companyName,
      companyUrl,
      requirement,
      budget: finalBudget,
    };

    const enrichedData = await enrichProfile(searchData, userData);

    if (!enrichedData) {
      throw new Error("AI Processing failed to generate a profile.");
    }

    // 3. Save to Database (Matching InsertSearchParams logic)
    const payloadForStorage = {
      fullname: name,
      companyName: companyName,
      role: role || "",
      email_address: email,
      requirement: requirement,
      budget: finalBudget,
      responce_results: JSON.stringify(enrichedData),
      search_params: JSON.stringify({
        name,
        companyName,
        role,
        email,
        mobile,
        companyUrl,
        requirement,
        budget: finalBudget,
      }),
      status: 1,
    };

    // Step 1: Insert into searchparams table
    const searchSql = `
      INSERT INTO searchparams 
      (fullname, companyName, role, email_address, requirement, budget, search_params, status) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(
      searchSql,
      [
        payloadForStorage.fullname,
        payloadForStorage.companyName,
        payloadForStorage.role,
        payloadForStorage.email_address,
        payloadForStorage.requirement,
        payloadForStorage.budget,
        payloadForStorage.search_params,
        payloadForStorage.status,
      ],
      (err, result) => {
        if (err) {
          console.error("Database error (searchparams):", err);
          return res.status(500).json({
            status: 500,
            success: false,
            message: "Error saving search parameters",
            error: err.message,
          });
        }

        const searchParamId = result.insertId;

        // Step 2: Insert into ai_responce table
        const responseSql = `
          INSERT INTO ai_responce 
          (search_id, responce_results, status) 
          VALUES (?, ?, ?)
        `;

        db.query(
          responseSql,
          [searchParamId, payloadForStorage.responce_results, payloadForStorage.status],
          (err, responseResult) => {
            if (err) {
              console.error("Database error (ai_responce):", err);
              return res.status(200).json({
                status: 200,
                success: true,
                message: "Investigation complete but results storage failed.",
                searchParamId: searchParamId, // Updated to match original
                results: enrichedData,
              });
            }

            // Success Response - Aligned with searchController.js
            res.status(200).json({
              status: 200,
              success: true,
              message: "Investigation complete and results saved.",
              searchParamId: searchParamId, // Updated from searchId
              responseId: responseResult.insertId,
              results: enrichedData,
            });
          }
        );
      }
    );
  } catch (error) {
    console.error("Agent Investigation Error:", error);
    res.status(500).json({
      status: 500,
      success: false,
      message: error.message || "An error occurred during agent investigation.",
    });
  }
};
