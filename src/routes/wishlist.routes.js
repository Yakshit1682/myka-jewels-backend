const express = require("express");

const {
  addToWishlist,
  getWishlist,
  removeFromWishlist,
} = require("../controllers/wishlist.controller");

const authMiddleware = require("../middleware/auth.middleware");

const router = express.Router();

router.get("/", authMiddleware, getWishlist);

router.post("/", authMiddleware, addToWishlist);

router.delete("/:product_uuid", authMiddleware, removeFromWishlist);

module.exports = router;
