const express = require("express");

const {
  createProduct,
  getProducts,
  getProductBySlug,
  updateProduct,
  deleteProduct,
  getSignatureProducts,
} = require("../controllers/product.controller");

const authMiddleware = require("../middleware/auth.middleware");
const requireRole = require("../middleware/role.middleware");

const router = express.Router();

/*
 * PUBLIC
 */

router.get("/", getProducts);

router.get("/signature", getSignatureProducts);

router.get("/:slug", getProductBySlug);

/*
 * ADMIN
 */

router.post("/", authMiddleware, requireRole("ADMIN"), createProduct);

router.patch("/:uuid", authMiddleware, requireRole("ADMIN"), updateProduct);

router.delete("/:uuid", authMiddleware, requireRole("ADMIN"), deleteProduct);

module.exports = router;
