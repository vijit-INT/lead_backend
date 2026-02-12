const express = require("express");
const router = express.Router();
const searchController = require("../controllers/searchController");

// POST
router.post("/insertsearchparams", searchController.insertSearchParams);

// GET all
router.get("/getsearchparams", searchController.getSearchParams);

// GET by ID
router.get("/searchparambyid/:id", searchController.getSearchParamById);

module.exports = router;