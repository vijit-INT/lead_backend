const axios = require("axios");
require("dotenv").config();

const apiKey = process.env.NEXT_PUBLIC_SERP_API_KEY;

/**
 * Executes a search query using SERP API
 * @param {string} query
 * @returns {Promise<Array>} List of search items
 */
async function googleSearch(query) {
  console.log(`🔍 SerpAPI Search: "${query}"`);
  try {
    if (!apiKey) {
      console.error("Missing SERP API configuration");
      return [];
    }

    const res = await axios.get("https://serpapi.com/search", {
      params: {
        api_key: apiKey,
        q: query,
        engine: "google",
      },
    });

    const items = res.data.organic_results || [];
    return items.map((item) => ({
      link: item.link,
      title: item.title,
      snippet: item.snippet,
    }));
  } catch (error) {
    console.error("SERP API Error:", error?.response?.data || error.message);
    return [];
  }
}

/**
 * Finds the most likely LinkedIn profile URL candidates for a person
 */
async function findLinkedInProfile(name, company, role = "") {
  // Use a highly targeted query to prioritize current company association
  const queries = [
    `site:linkedin.com/in "${name}" "${company}" "${role}"`,
    `site:linkedin.com/in "${name}" "${company}"`,
    `site:linkedin.com/in "${name}" ${role}`,
  ];

  const allCandidates = [];
  const seenUrls = new Set();

  for (const query of queries) {
    const results = await googleSearch(query);
    const resultsFound = results.filter(
      (r) =>
        r.link.includes("linkedin.com/in") &&
        !r.link.includes("/dir/") &&
        !r.link.includes("/posts/"),
    );

    for (const r of resultsFound) {
      if (!seenUrls.has(r.link)) {
        seenUrls.add(r.link);
        allCandidates.push({
          url: r.link,
          snippet: r.snippet,
          title: r.title,
        });
      }
    }

    // If we already have good candidates from the most specific query, we can stop
    if (allCandidates.length >= 2) break;
  }

  return allCandidates;
}

/**
 * Performs deep research on a person
 */
async function deepPersonSearch(name, company, role = "") {
  const queries = [
    `"${name}" "${company}" interview OR news OR article`,
    `"${name}" professional background skills`,
    `site:twitter.com "${name}" "${company}"`,
    `site:github.com "${name}"`,
    `"${name}" ${role} portfolios`,
  ];

  const searchPromises = queries.map((q) => googleSearch(q));
  const resultsArray = await Promise.all(searchPromises);

  const allResults = resultsArray.flat();
  const seenUrls = new Set();

  return allResults.filter((item) => {
    if (!item.link || seenUrls.has(item.link)) return false;
    seenUrls.add(item.link);
    return true;
  });
}

/**
 * Finds the most likely Company LinkedIn Page URL
 */
async function findCompanyLinkedIn(company) {
  const query = `site:linkedin.com/company "${company}"`;
  const results = await googleSearch(query);

  const companyPage = results.find(
    (r) =>
      r.link.includes("linkedin.com/company") &&
      !r.link.includes("/life") &&
      !r.link.includes("/jobs"),
  );

  return {
    url: companyPage?.link || null,
    snippet: companyPage?.snippet || null,
    title: companyPage?.title || null,
  };
}

/**
 * Performs multiple targeted searches for deep company insights
 */
async function deepCompanySearch(company) {
  const queries = [
    `"${company}" company overview products services`,
    `"${company}" headquarters address employee count revenue`,
    `"${company}" latest news funding rounds acquisitions`,
    `"${company}" annual report financial statement filetype:pdf`,
    `"${company}" strategic roadmap expansion plans 2024 2025`,
    `site:linkedin.com/company "${company}" about`,
  ];

  const searchPromises = queries.map((q) => googleSearch(q));
  const resultsArray = await Promise.all(searchPromises);

  const allResults = resultsArray.flat();
  const seenUrls = new Set();

  return allResults.filter((item) => {
    if (seenUrls.has(item.link)) return false;
    seenUrls.add(item.link);
    return true;
  });
}

/**
 * Finds the company website
 */
async function findCompanyWebsite(company) {
  const query = `"${company}" official website`;
  const results = await googleSearch(
    query + " -site:linkedin.com -site:facebook.com -site:twitter.com",
  );

  return results[0]?.link || null;
}

module.exports = {
  googleSearch,
  findLinkedInProfile,
  deepPersonSearch,
  findCompanyLinkedIn,
  deepCompanySearch,
  findCompanyWebsite,
};
