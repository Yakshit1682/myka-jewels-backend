const express = require("express");

const {
  getDashboardStats,
} = require("../controllers/adminDashboard.controller");

const authMiddleware = require("../middleware/auth.middleware");

const requireRole = require("../middleware/role.middleware");

const router = express.Router();

router.use(authMiddleware, requireRole("ADMIN"));

router.get("/", getDashboardStats);

module.exports = router;
