const express = require("express");

const {
  getContacts,
  getContactByUuid,
  updateContact,
} = require("../controllers/adminContact.controller");

const authMiddleware = require("../middleware/auth.middleware");

const requireRole = require("../middleware/role.middleware");

const router = express.Router();

router.use(authMiddleware, requireRole("ADMIN"));

router.get("/", getContacts);

router.get("/:uuid", getContactByUuid);

router.patch("/:uuid", updateContact);

module.exports = router;
