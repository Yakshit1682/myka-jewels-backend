const express = require("express");

const {
  getCollections,
  getCollectionBySlug,
  createCollection,
  updateCollection,
  deleteCollection,
} = require("../controllers/collection.controller");

// const authMiddleware = require("../middleware/auth.middleware");

// const adminMiddleware = require("../middleware/admin.middleware");

const router = express.Router();

/*
 * PUBLIC
 */
router.get("/", getCollections);

router.get("/:slug", getCollectionBySlug);

/*
 * ADMIN
 */
// router.post("/", authMiddleware, adminMiddleware, createCollection);

// router.put("/:uuid", authMiddleware, adminMiddleware, updateCollection);

// router.delete("/:uuid", authMiddleware, adminMiddleware, deleteCollection);

module.exports = router;
