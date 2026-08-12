const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const authRoutes = require("./routes/auth.routes");
const categoryRoutes = require("./routes/category.routes");
const productRoutes = require("./routes/product.routes");
const wishlistRoutes = require("./routes/wishlist.routes");
const inquiryRoutes = require("./routes/inquiry.routes");
const contactRoutes = require("./routes/contact.routes");
const adminInquiryRoutes = require("./routes/adminInquiry.routes");
const adminContactRoutes = require("./routes/adminContact.routes");
const adminUserRoutes = require("./routes/adminUser.routes");
const adminDashboardRoutes = require("./routes/adminDashboard.routes");
const adminSetupRoutes = require("./routes/adminSetup.routes");

const errorHandler = require("./middleware/error.middleware");

const {
  authLimiter,
  contactLimiter,
  inquiryLimiter,
} = require("./middleware/rateLimit.middleware");

const app = express();

app.use(helmet());

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  }),
);

app.use(
  express.json({
    limit: "30mb",
  }),
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "30mb",
  }),
);

/*
 * HEALTH
 */

app.get("/api/v1/health", (req, res) => {
  return res.status(200).json({
    success: true,
    message: "MYKA Jewels API is running",
  });
});

/*
 * AUTH
 */

app.use("/api/v1/auth", authLimiter, authRoutes);

/*
 * PUBLIC
 */

app.use("/api/v1/categories", categoryRoutes);

app.use("/api/v1/products", productRoutes);

app.use("/api/v1/contact", contactLimiter, contactRoutes);

/*
 * USER
 */

app.use("/api/v1/wishlist", wishlistRoutes);

app.use("/api/v1/inquiries", inquiryLimiter, inquiryRoutes);

/*
 * ADMIN
 */

app.use("/api/v1/admin/inquiries", adminInquiryRoutes);

app.use("/api/v1/admin/contacts", adminContactRoutes);

app.use("/api/v1/admin/users", adminUserRoutes);

app.use("/api/v1/admin/dashboard", adminDashboardRoutes);

app.use("/api/v1/admin-setup", adminSetupRoutes);

/*
 * 404
 */

app.use((req, res) => {
  return res.status(404).json({
    success: false,
    message: "API endpoint not found",
  });
});

/*
 * GLOBAL ERROR HANDLER
 */

app.use(errorHandler);

module.exports = app;
