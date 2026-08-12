const express = require("express");

const {
  getCategories,
  getCategoryBySlug,
  createCategory,
  updateCategory,
  deleteCategory,
} = require("../controllers/category.controller");

const authMiddleware = require("../middleware/auth.middleware");

const requireRole = require("../middleware/role.middleware");

const router = express.Router();

/*
 * Public
 */

router.get("/", getCategories);

router.get("/:slug", getCategoryBySlug);

/*
 * Admin
 */

router.post("/", authMiddleware, requireRole("ADMIN"), createCategory);

router.patch("/:uuid", authMiddleware, requireRole("ADMIN"), updateCategory);

router.delete("/:uuid", authMiddleware, requireRole("ADMIN"), deleteCategory);

module.exports = router;
