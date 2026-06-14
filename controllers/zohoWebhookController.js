const axios = require("axios");
const FormData = require("form-data");
const {
  findLinkedInProfile,
  findCompanyLinkedIn,
  findCompanyWebsite,
  deepCompanySearch,
  deepPersonSearch,
} = require("../lib/search");
const { enrichProfile } = require("../lib/gemini");
const { generateLeadReportPDF } = require("../lib/pdfGenerator");
const db = require("../config/db");

let cachedToken = null;
let tokenExpiry = null;

/**
 * Helper to get a valid Zoho Access Token using the Refresh Token.
 */
const getZohoAccessToken = async () => {
  if (cachedToken && tokenExpiry && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  try {
    const clientId = process.env.ZOHO_CLIENT_ID;
    const clientSecret = process.env.ZOHO_CLIENT_SECRET;
    const refreshToken = process.env.ZOHO_REFRESH_TOKEN;

    if (!clientId || !clientSecret || !refreshToken) {
      throw new Error("Missing Zoho OAuth credentials in .env");
    }

    const response = await axios.post(
      `https://accounts.zoho.in/oauth/v2/token?refresh_token=${refreshToken}&client_id=${clientId}&client_secret=${clientSecret}&grant_type=refresh_token`
    );

    if (response.data.access_token) {
      cachedToken = response.data.access_token;
      // Expires in 3600 seconds (1 hour). Subtract 5 mins (300,000 ms) as a buffer
      tokenExpiry = Date.now() + (response.data.expires_in * 1000) - 300000;
      console.log("[Zoho OAuth] Successfully refreshed access token.");
      return cachedToken;
    } else {
      throw new Error(JSON.stringify(response.data));
    }
  } catch (error) {
    console.error("[Zoho OAuth] Failed to refresh token:", error.message);
    return null;
  }
};

/**
 * Handle Webhook from Zoho CRM
 * POST /api/zoho-webhook
 */
exports.handleZohoWebhook = async (req, res) => {
  try {
    // 1. Extract Lead ID from webhook payload
    // Assuming the payload has lead_id directly or inside data[0].id
    const leadId = req.body.lead_id || (req.body.data && req.body.data[0] && req.body.data[0].id);

    if (!leadId) {
      return res.status(400).json({ success: false, message: "lead_id is missing in payload" });
    }

    console.log(`[Zoho Webhook] Received Lead ID: ${leadId}`);

    // Return immediate 200 OK so Zoho knows we received it, then process asynchronously
    res.status(200).json({ success: true, message: "Webhook received, processing..." });

    const accessToken = await getZohoAccessToken();
    if (!accessToken) {
      console.error("[Zoho Webhook] ZOHO_ACCESS_TOKEN is missing or failed to refresh.");
      return;
    }

    const headers = {
      Authorization: `Zoho-oauthtoken ${accessToken}`
    };

    // 2. Fetch Lead Details from Zoho CRM (using .in domain)
    const leadResponse = await axios.get(`https://www.zohoapis.in/crm/v8/Leads/${leadId}`, { headers });
    const leadData = leadResponse.data.data[0];

    if (!leadData) {
      console.error(`[Zoho Webhook] Lead data not found for ID: ${leadId}`);
      return;
    }

    const name = `${leadData.First_Name || ''} ${leadData.Last_Name || ''}`.trim() || "Unknown";
    const companyName = leadData.Company || "";
    const email = leadData.Email || "";
    const companyUrl = leadData.Website || "";
    const role = leadData.Designation || "";
    const mobile = leadData.Mobile || "";
    const requirement = leadData.Description || "General Requirement";
    const budget = "400000"; // Default budget

    console.log(`[Zoho Webhook] Fetched Lead: ${name} (${companyName})`);

    // 3. Gather Intelligence (Using existing Agent logic)
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

    const searchData = {
      userLinkedInCandidates,
      companyLinkedIn,
      companyWebsite,
      deepCompanyResults,
      deepPersonResults,
    };

    const userData = {
      name,
      role,
      companyName,
      companyUrl,
      requirement,
      budget,
      email,
      mobile
    };

    // 4. Advanced AI Synthesis
    const enrichedData = await enrichProfile(searchData, userData);

    if (!enrichedData) {
      throw new Error("AI Processing failed to generate a profile.");
    }

    // 5. Generate PDF Report
    const pdfBuffer = await generateLeadReportPDF(userData, enrichedData);

    // 6. Upload PDF to Zoho CRM
    const form = new FormData();
    form.append("file", pdfBuffer, {
      filename: `AI_Investigation_Report_${name.replace(/\\s+/g, "_")}.pdf`,
      contentType: "application/pdf"
    });

    const uploadHeaders = {
      ...headers,
      ...form.getHeaders()
    };

    const uploadResponse = await axios.post(
      `https://www.zohoapis.in/crm/v8/Leads/${leadId}/Attachments`,
      form,
      { headers: uploadHeaders }
    );
    console.log(`[Zoho Webhook] PDF Report uploaded successfully for Lead ID: ${leadId}`);

    // 7. Update Lead Score in Zoho CRM
    // Extract alignment score from enriched data, default to 0 if not found
    let leadScore = 0;
    if (enrichedData.businessAnalysis && enrichedData.businessAnalysis.alignmentScore) {
      leadScore = enrichedData.businessAnalysis.alignmentScore;
    }

    const updatePayload = {
      data: [
        {
          id: leadId,
          Lead_Score: leadScore
        }
      ]
    };

    const updateResponse = await axios.put(
      `https://www.zohoapis.in/crm/v8/Leads`,
      updatePayload,
      { headers: {
          Authorization: `Zoho-oauthtoken ${accessToken}`,
          "Content-Type": "application/json"
        }
      }
    );

    console.log(`[Zoho Webhook] Lead Score (${leadScore}) updated successfully for Lead ID: ${leadId}`);

    // Optional: Save to local database (searchparams and ai_responce)
    // Similar to agentController.js if needed.

  } catch (error) {
    console.error("[Zoho Webhook] Error during webhook processing:", error.message);
    if (error.response) {
      console.error("Zoho API Error details:", error.response.data);
    }
    // We already sent a 200 OK to Zoho, so no response here.
  }
};
