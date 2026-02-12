const express = require("express");
const router = express.Router();
const chatHistoryController = require("../controllers/chatHistoryController");

// Insert
router.post("/insertchathistory", chatHistoryController.insertChatHistory);

// Get all
router.get("/getchathistory", chatHistoryController.getAllChatHistory);

// Get by ID
router.get("/chathistorybyid/:id", chatHistoryController.getChatHistoryById);

module.exports = router;