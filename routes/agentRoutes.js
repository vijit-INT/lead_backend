const express = require("express");
const router = express.Router();
const agentController = require("../controllers/agentController");

/**
 * Main Agent investigation endpoint
 */
router.post("/agent", agentController.runAgent);

module.exports = router;
