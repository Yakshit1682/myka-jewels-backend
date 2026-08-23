const express = require("express");

const {
  getCollections,
  getCollectionByUuid,
  createCollection,
  updateCollection,
  deleteCollection,
} = require("../controllers/adminCollections.controller");

// const authMiddleware = require("../middleware/auth.middleware");
const authMiddleware = require("../middleware/auth.middleware");
const requireRole = require("../middleware/role.middleware");

// const adminMiddleware = require("../middleware/admin.middleware");

const router = express.Router();

router.use(authMiddleware, requireRole("ADMIN"));
// router.use(adminMiddleware);

router.get("/", getCollections);
router.get("/:uuid", getCollectionByUuid);

router.post("/", createCollection);
router.put("/:uuid", updateCollection);
router.delete("/:uuid", deleteCollection);

module.exports = router;
