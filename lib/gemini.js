const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

/**
 * Robustly extracts and parses JSON from a string that might contain extra text
 */
function extractJSON(text) {
  try {
    // 1. Try finding JSON inside triple backticks
    const match =
      text.match(/```json\s*([\s\S]*?)\s*```/) ||
      text.match(/```\s*([\s\S]*?)\s*```/);
    if (match) return JSON.parse(match[1].trim());

    // 2. If no backticks, find the first '{' and last '}'
    const firstBrace = text.indexOf("{");
    const lastBrace = text.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1) {
      const potentialJSON = text.substring(firstBrace, lastBrace + 1);
      return JSON.parse(potentialJSON);
    }

    // 3. Last resort: try to parse the whole string
    return JSON.parse(text.trim());
  } catch (e) {
    throw new Error(`Failed to parse AI response as JSON: ${e.message}`);
  }
}

/**
 * Uses Gemini to extract and structure data from raw search results
 */
async function enrichProfile(searchResults, userData) {
  console.log(`🤖 Gemini Enrichment Triggered for: ${userData.name}`);

  if (!genAI) {
    console.error("Gemini API key missing");
    return null;
  }

  // Use gemini-2.5-flash for reliability during heavy usage
  const model = genAI.getGenerativeModel(
    { model: "gemini-2.5-flash" },
    { apiVersion: "v1" },
  );

  const prompt = `
    STRICT REQUIREMENT: DO NOT TALK. YOUR ENTIRE RESPONSE MUST BE A SINGLE VALID JSON OBJECT. NO MARKDOWN INTRODUCTIONS. NO CHAT.

    You are a Senior Lead Intelligence Investigator. Your goal is to build a definitive, 360-degree profile of a person and their company based on heterogeneous search data.

    Investigative Context:
    Name: ${userData.name}
    Role: ${userData.role}
    Company: ${userData.companyName}
    URL: ${userData.companyUrl || "N/A"}
    Requirement: ${userData.requirement || "N/A"}
    Budget: ${userData.budget || "N/A"}
    
    Raw Intelligence Gathered:
    ${JSON.stringify(
      {
        userLinkedInCandidates: searchResults.userLinkedInCandidates,
        companyLinkedIn: searchResults.companyLinkedIn,
        companyWebsite: searchResults.companyWebsite,
        deepCompanyResults: (searchResults.deepCompanyResults || []).slice(
          0,
          3,
        ),
        deepPersonResults: (searchResults.deepPersonResults || []).slice(0, 3),
      },
      null,
      2,
    )}
    
    CRITICAL PROTOCOL:
    1. ENTITY RESOLUTION: In "userLinkedInCandidates", find the profile that CURRENTLY works for ${userData.companyName}. Avoid namesakes at other companies (e.g., DRDO).
    2. CROSS-VERIFICATION: Treat LinkedIn as truth for identity; official reports for financial capability.
    3. SCORING (0-50 pts): Corporate Intel (0-20), Profiles (0-10), Authority (0-15), Location (0-5).
       - 4. LOCATION (0-5 pts): High (5) for English, Hindi, or Bengali speaking regions. This score is independent of individual profile verification.

    JSON SCHEMA:
    {
      "businessAnalysis": {
        "requirementAnalysis": "...",
        "industryAlignment": "...",
        "budgetAnalysis": "...",
        "strategicFit": "...",
        "potentialRisks": ["..."],
        "recommendation": "...",
        "alignmentScore": 0-50,
        "scoreAttributes": [
          {"category": "CORPORATE INTELLIGENCE", "factor": "...", "contribution": "+X"},
          {"category": "INDIVIDUAL PROFILES", "factor": "...", "contribution": "+X"},
          {"category": "INDIVIDUAL AUTHORITY", "factor": "...", "contribution": "+X"},
          {"category": "LOCATION", "factor": "...", "contribution": "+X"}
        ]
      },
      "companyCoreRequirement": {
        "coreProducts": ["..."],
        "businessPresentation": "...",
        "keyOfferings": "..."
      },
      "financialAudit": {
        "companyStatus": "...",
        "financialSummary": "...",
        "futurePlans": "...",
        "requirementMatch": "...",
        "listingDetails": "..."
      },
      "userProfile": {
        "isFound": true,
        "fullName": "...",
        "currentRole": "...",
        "currentCompany": "...",
        "isCompanyMatch": true,
        "claimedCompanyMatchAnalysis": "...",
        "linkedinProfileUrl": "...",
        "linkedinProfileId": "...",
        "location": "...",
        "connections": "...",
        "summary": "...",
        "skills": ["List at least 15 skills"],
        "education": [{"institution": "...", "degree": "...", "field": "...", "duration": "..."}],
        "experience": [{"title": "...", "company": "...", "duration": "...", "description": "..."}]
      },
      "companyProfile": { ... },
      "additionalInfo": { "confidenceScore": 1.0, "verificationStatus": "VERIFIED", "dataSource": "...", "lastUpdated": "...", "notes": "..." }
    }
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    // Use robust extractor to ignore AI small talk
    return extractJSON(text);
  } catch (e) {
    console.error("Gemini Enrichment Failed:", e.message || e);
    // FALLBACK RESULT (STILL PRESERVING LINKEDIN URL IF FOUND)
    return {
      userProfile: {
        fullName: userData.name,
        currentRole: userData.role,
        currentCompany: userData.companyName,
        linkedinProfileUrl: (searchResults.userLinkedInCandidates || [])[0]
          ?.url,
      },
      companyProfile: {
        companyName: userData.companyName,
      },
      additionalInfo: {
        notes: "Generation failed - showing fallback data.",
      },
    };
  }
}

/**
 * Handles follow-up questions
 */
async function askFollowUp(question, previousResults, newSearchResults) {
  console.log(`🤖 Gemini Follow-up Researching: "${question}"`);

  if (!genAI) return "API Key missing";

  const model = genAI.getGenerativeModel(
    { model: "gemini-1.5-flash" },
    { apiVersion: "v1" },
  );

  const prompt = `
    You are the Senior Lead Intelligence Investigator. A user is asking a follow-up question about a target.
    Objective: Answer the user's question by combining previously gathered intelligence with newly discovered global web data.
    Previous Knowledge: ${JSON.stringify(previousResults, null, 2)}
    Newly Discovered Global Intelligence (Fresh Web Results): ${JSON.stringify(newSearchResults, null, 2)}
    User Question: "${question}"
    Format the output as clean Markdown.
  `;

  try {
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (e) {
    console.error("Gemini Follow-up Failed:", e);
    return "I encountered an error while researching your question. Please try again.";
  }
}

module.exports = {
  enrichProfile,
  askFollowUp,
};
