const axios = require("axios");
const https = require("https");
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

const zohoAxios = axios.create({
  httpsAgent: new https.Agent({ rejectUnauthorized: false }),
});

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

    const url = `https://accounts.zoho.in/oauth/v2/token?refresh_token=${refreshToken}&client_id=${clientId}&client_secret=${clientSecret}&grant_type=refresh_token`;
    console.log("[Zoho OAuth] Requesting URL:", url);

    const response = await zohoAxios.post(url);

    console.log("[Zoho OAuth] Response status:", response.status);
    console.log("[Zoho OAuth] Response data:", JSON.stringify(response.data, null, 2));

    if (response.data.access_token) {
      cachedToken = response.data.access_token;
      tokenExpiry = Date.now() + (response.data.expires_in * 1000) - 300000;
      console.log("[Zoho OAuth] Successfully refreshed access token.");
      return cachedToken;
    } else {
      throw new Error(JSON.stringify(response.data));
    }
  } catch (error) {
    console.error("[Zoho OAuth] Failed to refresh token:", error.message);
    if (error.response) {
      console.error("[Zoho OAuth] Error status:", error.response.status);
      console.error("[Zoho OAuth] Error data:", JSON.stringify(error.response.data, null, 2));
    }
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
    const leadResponse = await zohoAxios.get(`https://www.zohoapis.in/crm/v8/Leads/${leadId}`, { headers });
    const leadData = leadResponse.data.data[0];
    if (!leadData) {
      console.error(`[Zoho Webhook] Lead data not found for ID: ${leadId}`);
      return;
    }

    // Parse HubSpot payload for enriched fallback fields
    let hubspot = {};
    try {
      if (leadData.Complete_Hubspot_Payload) {
        hubspot = JSON.parse(leadData.Complete_Hubspot_Payload);
      }
    } catch (_) { }

    const name = leadData.Full_Name
      || `${leadData.First_Name || ''} ${leadData.Last_Name || ''}`.trim()
      || hubspot.firstname
      || "Unknown";
    const companyName = leadData.Company || hubspot.company || "";
    const email = leadData.Email || hubspot.email || "";
    const companyUrl = leadData.Website || hubspot.hs_analytics_first_url || "";
    const role = leadData.Designation || hubspot.your_role || "";
    const mobile = leadData.Mobile || leadData.Phone || hubspot.phone || "";
    const requirement = leadData.Description || leadData.Requirement || hubspot.requirements || "General Requirement";
    const budget = leadData.What_is_your_budget || hubspot.what_is_your_budget || "Not specified";

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

    // 5.5 Save PDF locally
    const fs = require("fs");
    const path = require("path");
    const reportsDir = path.join(__dirname, "..", "reports");
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    const fileName = `AI_Investigation_Report_${name.replace(/\s+/g, "_")}.pdf`;
    const filePath = path.join(reportsDir, fileName);
    fs.writeFileSync(filePath, pdfBuffer);
    console.log(`[Zoho Webhook] PDF Report saved locally at: ${filePath}`);

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

    const uploadResponse = await zohoAxios.post(
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

    const updateResponse = await zohoAxios.put(
      `https://www.zohoapis.in/crm/v8/Leads`,
      updatePayload,
      {
        headers: {
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
