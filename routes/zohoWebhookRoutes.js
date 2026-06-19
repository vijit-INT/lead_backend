const express = require("express");
const router = express.Router();
const zohoWebhookController = require("../controllers/zohoWebhookController");

/**
 * Middleware to validate X-API-Key header for webhook authentication.
 */
const validateApiKey = (req, res, next) => {
  const apiKey = req.headers["x-api-key"];

  if (!apiKey) {
    return res.status(401).json({ success: false, message: "Missing X-API-Key header" });
  }

  if (apiKey !== process.env.ZOHO_WEBHOOK_API_KEY) {
    return res.status(403).json({ success: false, message: "Invalid API Key" });
  }

  next();
};

// POST /api/zoho-webhook
router.post("/zoho-webhook", validateApiKey, zohoWebhookController.handleZohoWebhook);

module.exports = router;
