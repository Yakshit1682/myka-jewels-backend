const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const createAccessToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
};

const verifyAccessToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

const hashToken = (token) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

const generateResetToken = () => {
  return crypto.randomBytes(32).toString("hex");
};

module.exports = {
  createAccessToken,
  verifyAccessToken,
  hashToken,
  generateResetToken,
};
