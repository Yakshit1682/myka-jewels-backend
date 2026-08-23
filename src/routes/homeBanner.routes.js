const express = require("express");

const {
  getAdminHomeBanners,
  getAdminHomeBannerByUuid,
  createHomeBanner,
  updateHomeBanner,
  deleteHomeBanner,
  getHomeBanners,
} = require("../controllers/homeBanner.controller");

const authMiddleware = require("../middleware/auth.middleware");

const adminMiddleware = require("../middleware/admin.middleware");

const router = express.Router();

/*
|--------------------------------------------------------------------------
| PUBLIC
|--------------------------------------------------------------------------
*/

router.get("/home/banners", getHomeBanners);

/*
|--------------------------------------------------------------------------
| ADMIN
|--------------------------------------------------------------------------
*/

router.get(
  "/admin/home-banners",
  authMiddleware,
  adminMiddleware,
  getAdminHomeBanners,
);

router.get(
  "/admin/home-banners/:uuid",
  authMiddleware,
  adminMiddleware,
  getAdminHomeBannerByUuid,
);

router.post(
  "/admin/home-banners",
  authMiddleware,
  adminMiddleware,
  createHomeBanner,
);

router.put(
  "/admin/home-banners/:uuid",
  authMiddleware,
  adminMiddleware,
  updateHomeBanner,
);

router.delete(
  "/admin/home-banners/:uuid",
  authMiddleware,
  adminMiddleware,
  deleteHomeBanner,
);

module.exports = router;
