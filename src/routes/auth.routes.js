const express = require("express");

const {
  register,
  login,
  me,
  logout,
  logoutAll,
  forgotPassword,
  resetPassword,
} = require("../controllers/auth.controller");

const authMiddleware = require("../middleware/auth.middleware");

const router = express.Router();

router.post("/register", register);

router.post("/login", login);

router.get("/me", authMiddleware, me);

router.post("/logout", authMiddleware, logout);

router.post("/logout-all", authMiddleware, logoutAll);

router.post("/forgot-password", forgotPassword);

router.post("/reset-password", resetPassword);

module.exports = router;
