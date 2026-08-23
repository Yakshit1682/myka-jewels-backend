const { HomeBanner, HomeBannerImage } = require("../models");

const sequelize = require("../config/database");

const { Op } = require("sequelize");

const isValidImageDataUri = (value) => {
  if (!value || typeof value !== "string") {
    return false;
  }

  return /^data:image\/(png|jpeg|jpg|webp);base64,/.test(value);
};

/*
|--------------------------------------------------------------------------
| ADMIN - GET ALL
|--------------------------------------------------------------------------
*/

const getAdminHomeBanners = async (req, res) => {
  try {
    const banners = await HomeBanner.findAll({
      include: [
        {
          model: HomeBannerImage,
          as: "images",
          required: false,

          attributes: [
            "uuid",
            "image_data_uri",
            "alt_text",
            "sort_order",
            "link_url",
          ],
        },
      ],

      order: [
        ["sort_order", "ASC"],
        ["created_at", "DESC"],

        [
          {
            model: HomeBannerImage,
            as: "images",
          },
          "sort_order",
          "ASC",
        ],
      ],
    });

    return res.status(200).json({
      success: true,
      data: banners,
    });
  } catch (error) {
    console.error("Get admin home banners error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch home banners",
    });
  }
};

/*
|--------------------------------------------------------------------------
| ADMIN - GET ONE BY UUID
|--------------------------------------------------------------------------
*/

const getAdminHomeBannerByUuid = async (req, res) => {
  try {
    const { uuid } = req.params;

    const banner = await HomeBanner.findOne({
      where: {
        uuid,
      },

      include: [
        {
          model: HomeBannerImage,
          as: "images",
          required: false,

          attributes: [
            "uuid",
            "image_data_uri",
            "alt_text",
            "sort_order",
            "link_url",
          ],
        },
      ],

      order: [
        [
          {
            model: HomeBannerImage,
            as: "images",
          },
          "sort_order",
          "ASC",
        ],
      ],
    });

    if (!banner) {
      return res.status(404).json({
        success: false,
        message: "Home banner not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: banner,
    });
  } catch (error) {
    console.error("Get home banner error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch home banner",
    });
  }
};

/*
|--------------------------------------------------------------------------
| ADMIN - CREATE
|--------------------------------------------------------------------------
*/

const createHomeBanner = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const {
      title,
      subtitle,
      description,

      type = "BANNER",

      button_text,
      button_url,

      sort_order = 0,

      is_active = true,

      starts_at,
      ends_at,

      images = [],
    } = req.body;

    /*
     * TYPE
     */

    const allowedTypes = ["BANNER", "CAROUSEL"];

    if (!allowedTypes.includes(type)) {
      await transaction.rollback();

      return res.status(400).json({
        success: false,
        message: "Invalid banner type",
      });
    }

    /*
     * IMAGES
     */

    if (!Array.isArray(images)) {
      await transaction.rollback();

      return res.status(400).json({
        success: false,
        message: "images must be an array",
      });
    }

    if (type === "BANNER" && images.length !== 1) {
      await transaction.rollback();

      return res.status(400).json({
        success: false,
        message: "Banner requires exactly one image",
      });
    }

    if (type === "CAROUSEL" && (images.length < 2 || images.length > 5)) {
      await transaction.rollback();

      return res.status(400).json({
        success: false,
        message: "Carousel requires between 2 and 5 images",
      });
    }

    for (const image of images) {
      if (!isValidImageDataUri(image.image_data_uri)) {
        await transaction.rollback();

        return res.status(400).json({
          success: false,
          message: "Invalid banner image Data URI",
        });
      }
    }

    /*
     * DATES
     */

    if (starts_at && ends_at && new Date(starts_at) > new Date(ends_at)) {
      await transaction.rollback();

      return res.status(400).json({
        success: false,
        message: "Start date cannot be after end date",
      });
    }

    /*
     * CREATE BANNER
     */

    const banner = await HomeBanner.create(
      {
        title: title?.trim() || null,

        subtitle: subtitle?.trim() || null,

        description: description?.trim() || null,

        type,

        button_text: button_text?.trim() || null,

        button_url: button_url?.trim() || null,

        sort_order: Number(sort_order) || 0,

        is_active: Boolean(is_active),

        starts_at: starts_at || null,

        ends_at: ends_at || null,
      },
      {
        transaction,
      },
    );

    /*
     * CREATE IMAGES
     */

    await HomeBannerImage.bulkCreate(
      images.map((image, index) => ({
        banner_id: banner.id,

        image_data_uri: image.image_data_uri,

        alt_text: image.alt_text?.trim() || title?.trim() || null,

        /*
         * Always 1-5.
         */
        sort_order: index + 1,

        link_url: image.link_url?.trim() || null,
      })),

      {
        transaction,
      },
    );

    await transaction.commit();

    const createdBanner = await HomeBanner.findByPk(banner.id, {
      include: [
        {
          model: HomeBannerImage,

          as: "images",

          required: false,
        },
      ],

      order: [
        [
          {
            model: HomeBannerImage,

            as: "images",
          },

          "sort_order",

          "ASC",
        ],
      ],
    });

    return res.status(201).json({
      success: true,
      message: "Home banner created successfully",
      data: createdBanner,
    });
  } catch (error) {
    if (!transaction.finished) {
      await transaction.rollback();
    }

    console.error("Create home banner error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to create home banner",
    });
  }
};

/*
|--------------------------------------------------------------------------
| ADMIN - UPDATE
|--------------------------------------------------------------------------
*/

const updateHomeBanner = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { uuid } = req.params;

    const {
      title,
      subtitle,
      description,

      type,

      button_text,
      button_url,

      sort_order,
      is_active,

      starts_at,
      ends_at,

      images,
    } = req.body;

    const banner = await HomeBanner.findOne({
      where: {
        uuid,
      },

      transaction,
    });

    if (!banner) {
      await transaction.rollback();

      return res.status(404).json({
        success: false,
        message: "Home banner not found",
      });
    }

    /*
     * TYPE
     */

    let finalType = banner.type;

    if (type !== undefined) {
      if (!["BANNER", "CAROUSEL"].includes(type)) {
        await transaction.rollback();

        return res.status(400).json({
          success: false,
          message: "Invalid banner type",
        });
      }

      finalType = type;

      banner.type = type;
    }

    /*
     * BASIC FIELDS
     */

    if (title !== undefined) {
      banner.title = title?.trim() || null;
    }

    if (subtitle !== undefined) {
      banner.subtitle = subtitle?.trim() || null;
    }

    if (description !== undefined) {
      banner.description = description?.trim() || null;
    }

    if (button_text !== undefined) {
      banner.button_text = button_text?.trim() || null;
    }

    if (button_url !== undefined) {
      banner.button_url = button_url?.trim() || null;
    }

    if (sort_order !== undefined) {
      const parsedSortOrder = Number(sort_order);

      if (Number.isNaN(parsedSortOrder)) {
        await transaction.rollback();

        return res.status(400).json({
          success: false,
          message: "Invalid sort order",
        });
      }

      banner.sort_order = parsedSortOrder;
    }

    if (is_active !== undefined) {
      banner.is_active = Boolean(is_active);
    }

    /*
     * DATES
     */

    const finalStartsAt =
      starts_at !== undefined ? starts_at : banner.starts_at;

    const finalEndsAt = ends_at !== undefined ? ends_at : banner.ends_at;

    if (
      finalStartsAt &&
      finalEndsAt &&
      new Date(finalStartsAt) > new Date(finalEndsAt)
    ) {
      await transaction.rollback();

      return res.status(400).json({
        success: false,
        message: "Start date cannot be after end date",
      });
    }

    if (starts_at !== undefined) {
      banner.starts_at = starts_at || null;
    }

    if (ends_at !== undefined) {
      banner.ends_at = ends_at || null;
    }

    await banner.save({
      transaction,
    });

    /*
     * REPLACE IMAGES
     */

    if (images !== undefined) {
      if (!Array.isArray(images)) {
        await transaction.rollback();

        return res.status(400).json({
          success: false,
          message: "images must be an array",
        });
      }

      if (finalType === "BANNER" && images.length !== 1) {
        await transaction.rollback();

        return res.status(400).json({
          success: false,
          message: "Banner requires exactly one image",
        });
      }

      if (
        finalType === "CAROUSEL" &&
        (images.length < 2 || images.length > 5)
      ) {
        await transaction.rollback();

        return res.status(400).json({
          success: false,
          message: "Carousel requires between 2 and 5 images",
        });
      }

      for (const image of images) {
        if (!isValidImageDataUri(image.image_data_uri)) {
          await transaction.rollback();

          return res.status(400).json({
            success: false,
            message: "Invalid banner image Data URI",
          });
        }
      }

      /*
       * Mapping table / child rows:
       * hard replace is simplest.
       */

      await HomeBannerImage.destroy({
        where: {
          banner_id: banner.id,
        },

        force: true,

        transaction,
      });

      await HomeBannerImage.bulkCreate(
        images.map((image, index) => ({
          banner_id: banner.id,

          image_data_uri: image.image_data_uri,

          alt_text: image.alt_text?.trim() || banner.title || null,

          sort_order: index + 1,

          link_url: image.link_url?.trim() || null,
        })),

        {
          transaction,
        },
      );
    }

    await transaction.commit();

    const updatedBanner = await HomeBanner.findByPk(
      banner.id,

      {
        include: [
          {
            model: HomeBannerImage,

            as: "images",

            required: false,
          },
        ],

        order: [
          [
            {
              model: HomeBannerImage,

              as: "images",
            },

            "sort_order",

            "ASC",
          ],
        ],
      },
    );

    return res.status(200).json({
      success: true,

      message: "Home banner updated successfully",

      data: updatedBanner,
    });
  } catch (error) {
    if (!transaction.finished) {
      await transaction.rollback();
    }

    console.error("Update home banner error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update home banner",
    });
  }
};

/*
|--------------------------------------------------------------------------
| ADMIN - DELETE / DISABLE
|--------------------------------------------------------------------------
*/

const deleteHomeBanner = async (req, res) => {
  try {
    const { uuid } = req.params;

    const banner = await HomeBanner.findOne({
      where: {
        uuid,
      },
    });

    if (!banner) {
      return res.status(404).json({
        success: false,
        message: "Home banner not found",
      });
    }

    /*
     * Same pattern as categories/collections:
     * disable instead of physical delete.
     */

    banner.is_active = false;

    await banner.save();

    return res.status(200).json({
      success: true,
      message: "Home banner disabled successfully",
    });
  } catch (error) {
    console.error("Delete home banner error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to disable home banner",
    });
  }
};

/*
|--------------------------------------------------------------------------
| PUBLIC - ACTIVE HOME BANNERS
|--------------------------------------------------------------------------
*/

const getHomeBanners = async (req, res) => {
  try {
    const now = new Date();

    const banners = await HomeBanner.findAll({
      where: {
        is_active: true,

        [Op.and]: [
          {
            [Op.or]: [
              {
                starts_at: null,
              },

              {
                starts_at: {
                  [Op.lte]: now,
                },
              },
            ],
          },

          {
            [Op.or]: [
              {
                ends_at: null,
              },

              {
                ends_at: {
                  [Op.gte]: now,
                },
              },
            ],
          },
        ],
      },

      attributes: [
        "uuid",
        "title",
        "subtitle",
        "description",
        "type",
        "button_text",
        "button_url",
        "sort_order",
      ],

      include: [
        {
          model: HomeBannerImage,

          as: "images",

          required: true,

          attributes: [
            "uuid",
            "image_data_uri",
            "alt_text",
            "sort_order",
            "link_url",
          ],
        },
      ],

      order: [
        ["sort_order", "ASC"],

        [
          {
            model: HomeBannerImage,

            as: "images",
          },

          "sort_order",

          "ASC",
        ],
      ],
    });

    console.log("Fetched public home banners:", banners);

    return res.status(200).json({
      success: true,
      data: banners,
    });
  } catch (error) {
    console.error("Get public home banners error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch home banners",
    });
  }
};

module.exports = {
  getAdminHomeBanners,
  getAdminHomeBannerByUuid,

  createHomeBanner,
  updateHomeBanner,
  deleteHomeBanner,

  getHomeBanners,
};
