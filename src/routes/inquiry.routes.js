const express = require("express");

const {
  createInquiry,
  getMyInquiries,
} = require("../controllers/inquiry.controller");

const authMiddleware = require("../middleware/auth.middleware");

const router = express.Router();

/*
 * Get logged-in user's inquiries
 */
router.get("/my", authMiddleware, getMyInquiries);

/*
 * Create WhatsApp product inquiry
 */
router.post("/products/:product_uuid", authMiddleware, createInquiry);

module.exports = router;
