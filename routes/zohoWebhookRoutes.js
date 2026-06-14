const express = require("express");
const router = express.Router();
const zohoWebhookController = require("../controllers/zohoWebhookController");

// POST /api/zoho-webhook
router.post("/zoho-webhook", zohoWebhookController.handleZohoWebhook);

module.exports = router;
