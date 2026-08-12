const express = require("express");

const { createAdmin } = require("../controllers/adminSetup.controller");

const router = express.Router();

router.post("/create", createAdmin);

module.exports = router;
