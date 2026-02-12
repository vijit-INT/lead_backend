const express = require("express");
const router = express.Router();
const responseController = require("../controllers/responseController");

// Insert
router.post("/insertresponse", responseController.insertResponse);

// Get all
router.get("/getresponses", responseController.getAllResponses);

// Get by ID
router.get("/responsebyid/:id", responseController.getResponseById);

module.exports = router;
