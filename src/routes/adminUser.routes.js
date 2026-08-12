const express = require("express");

const {
  getUsers,
  getUserByUuid,
  updateUserStatus,
} = require("../controllers/adminUser.controller");

const authMiddleware = require("../middleware/auth.middleware");

const requireRole = require("../middleware/role.middleware");

const router = express.Router();

router.use(authMiddleware, requireRole("ADMIN"));

router.get("/", getUsers);

router.get("/:uuid", getUserByUuid);

router.patch("/:uuid/status", updateUserStatus);

module.exports = router;
