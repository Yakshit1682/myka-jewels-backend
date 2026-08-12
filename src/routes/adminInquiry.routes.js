const express = require("express");

const {
  getInquiries,
  getInquiryByUuid,
  updateInquiry,
} = require("../controllers/adminInquiry.controller");

const authMiddleware = require("../middleware/auth.middleware");

const requireRole = require("../middleware/role.middleware");

const router = express.Router();

router.use(authMiddleware, requireRole("ADMIN"));

router.get("/", getInquiries);

router.get("/:uuid", getInquiryByUuid);

router.patch("/:uuid", updateInquiry);

module.exports = router;
