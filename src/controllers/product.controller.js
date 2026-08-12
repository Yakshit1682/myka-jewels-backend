const { Op } = require("sequelize");

const {
  Product,
  ProductImage,
  ProductCategory,
  ProductInquiry,
  Category,
} = require("../models");

const sequelize = require("../config/database");
const createSlug = require("../utils/slug");
const { isValidImageDataUri } = require("../utils/dataUri");

/*
 * CREATE PRODUCT
 */

const createProduct = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const {
      name,
      sku,
      short_description,
      description,
      material,
      metal_color,
      price,
      compare_at_price,
      weight_grams,
      stock_status,
      is_featured,
      category_uuids = [],
      images = [],
    } = req.body;

    if (!name?.trim()) {
      await transaction.rollback();

      return res.status(400).json({
        success: false,
        message: "Product name is required",
      });
    }

    if (!Array.isArray(category_uuids)) {
      await transaction.rollback();

      return res.status(400).json({
        success: false,
        message: "category_uuids must be an array",
      });
    }

    if (!Array.isArray(images)) {
      await transaction.rollback();

      return res.status(400).json({
        success: false,
        message: "images must be an array",
      });
    }

    if (images.length > 4) {
      await transaction.rollback();

      return res.status(400).json({
        success: false,
        message: "Maximum 4 images are allowed",
      });
    }

    for (const image of images) {
      if (!isValidImageDataUri(image.data_uri)) {
        await transaction.rollback();

        return res.status(400).json({
          success: false,
          message: "Invalid image Data URI",
        });
      }
    }

    let slug = createSlug(name);

    const existingSlug = await Product.findOne({
      where: { slug },
      transaction,
    });

    if (existingSlug) {
      slug = `${slug}-${Date.now()}`;
    }

    if (sku) {
      const existingSku = await Product.findOne({
        where: {
          sku: sku.trim(),
        },
        transaction,
      });

      if (existingSku) {
        await transaction.rollback();

        return res.status(409).json({
          success: false,
          message: "SKU already exists",
        });
      }
    }

    const product = await Product.create(
      {
        name: name.trim(),
        slug,

        sku: sku?.trim() || null,

        short_description: short_description?.trim() || null,

        description: description?.trim() || null,

        material: material?.trim() || null,

        metal_color: metal_color?.trim() || null,

        price: price ?? null,

        compare_at_price: compare_at_price ?? null,

        weight_grams: weight_grams ?? null,

        stock_status: stock_status || "IN_STOCK",

        is_featured: Boolean(is_featured),

        created_by: req.user?.id || null,

        updated_by: req.user?.id || null,
      },
      {
        transaction,
      },
    );

    if (category_uuids.length > 0) {
      const categories = await Category.findAll({
        where: {
          uuid: {
            [Op.in]: category_uuids,
          },
        },
        transaction,
      });

      if (categories.length !== category_uuids.length) {
        await transaction.rollback();

        return res.status(400).json({
          success: false,
          message: "One or more categories are invalid",
        });
      }

      await ProductCategory.bulkCreate(
        categories.map((category) => ({
          product_id: product.id,
          category_id: category.id,
        })),
        {
          transaction,
        },
      );
    }

    if (images.length > 0) {
      await ProductImage.bulkCreate(
        images.map((image, index) => ({
          product_id: product.id,
          data_uri: image.data_uri,
          sort_order: image.sort_order ?? index,
          is_primary:
            image.is_primary !== undefined
              ? Boolean(image.is_primary)
              : index === 0,
        })),
        {
          transaction,
        },
      );
    }

    await transaction.commit();

    const createdProduct = await Product.findByPk(product.id, {
      include: [
        {
          model: ProductImage,
          as: "images",
        },
        {
          model: Category,
          as: "categories",
          through: {
            attributes: [],
          },
        },
      ],
    });

    return res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: createdProduct,
    });
  } catch (error) {
    await transaction.rollback();

    console.error("Create product error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to create product",
    });
  }
};

/*
 * GET PRODUCTS
 */

const getProducts = async (req, res) => {
  try {
    const { category, featured, search, page = 1, limit = 12 } = req.query;

    const safePage = Math.max(Number(page) || 1, 1);
    const safeLimit = Math.min(Math.max(Number(limit) || 12, 1), 50);

    const offset = (safePage - 1) * safeLimit;

    const productWhere = {
      is_active: true,
    };

    if (featured === "true") {
      productWhere.is_featured = true;
    }

    if (search?.trim()) {
      productWhere[Op.or] = [
        {
          name: {
            [Op.like]: `%${search.trim()}%`,
          },
        },
        {
          sku: {
            [Op.like]: `%${search.trim()}%`,
          },
        },
        {
          short_description: {
            [Op.like]: `%${search.trim()}%`,
          },
        },
      ];
    }

    const categoryInclude = {
      model: Category,
      as: "categories",
      through: {
        attributes: [],
      },
      required: false,
    };

    if (category) {
      categoryInclude.where = {
        slug: category,
        is_active: true,
      };

      categoryInclude.required = true;
    }

    const { count, rows } = await Product.findAndCountAll({
      where: productWhere,

      include: [
        {
          model: ProductImage,
          as: "images",
          required: false,
        },

        categoryInclude,
      ],

      distinct: true,

      limit: safeLimit,
      offset,

      order: [
        ["created_at", "DESC"],
        [{ model: ProductImage, as: "images" }, "sort_order", "ASC"],
      ],
    });

    return res.status(200).json({
      success: true,

      data: rows,

      pagination: {
        page: safePage,
        limit: safeLimit,
        total: count,
        total_pages: Math.ceil(count / safeLimit),
      },
    });
  } catch (error) {
    console.error("Get products error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch products",
    });
  }
};

/*
 * GET PRODUCT BY SLUG
 */

const getProductBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const product = await Product.findOne({
      where: {
        slug,
        is_active: true,
      },

      include: [
        {
          model: ProductImage,
          as: "images",
          required: false,
        },

        {
          model: Category,
          as: "categories",
          required: false,

          through: {
            attributes: [],
          },
        },
      ],

      order: [[{ model: ProductImage, as: "images" }, "sort_order", "ASC"]],
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    console.error("Get product error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch product",
    });
  }
};

/*
 * UPDATE PRODUCT
 */

const updateProduct = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { uuid } = req.params;

    const {
      name,
      sku,
      short_description,
      description,
      material,
      price,
      is_featured,
      is_active,
      category_uuids,
      images,
    } = req.body;

    const product = await Product.findOne({
      where: {
        uuid,
      },
      transaction,
    });

    if (!product) {
      await transaction.rollback();

      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    if (name !== undefined) {
      if (!name?.trim()) {
        await transaction.rollback();

        return res.status(400).json({
          success: false,
          message: "Product name cannot be empty",
        });
      }

      product.name = name.trim();

      const newSlug = createSlug(name);

      const duplicate = await Product.findOne({
        where: {
          slug: newSlug,
          id: {
            [Op.ne]: product.id,
          },
        },
        transaction,
      });

      product.slug = duplicate ? `${newSlug}-${Date.now()}` : newSlug;
    }

    if (sku !== undefined) {
      const normalizedSku = sku?.trim() || null;

      if (normalizedSku) {
        const existingSku = await Product.findOne({
          where: {
            sku: normalizedSku,
            id: {
              [Op.ne]: product.id,
            },
          },
          transaction,
        });

        if (existingSku) {
          await transaction.rollback();

          return res.status(409).json({
            success: false,
            message: "SKU already exists",
          });
        }
      }

      product.sku = normalizedSku;
    }

    if (short_description !== undefined) {
      product.short_description = short_description?.trim() || null;
    }

    if (description !== undefined) {
      product.description = description?.trim() || null;
    }

    if (material !== undefined) {
      product.material = material?.trim() || null;
    }

    if (price !== undefined) {
      product.price = price ?? null;
    }

    if (is_featured !== undefined) {
      product.is_featured = Boolean(is_featured);
    }

    if (is_active !== undefined) {
      product.is_active = Boolean(is_active);
    }

    if (metal_color !== undefined) {
      product.metal_color = metal_color?.trim() || null;
    }

    if (compare_at_price !== undefined) {
      product.compare_at_price = compare_at_price ?? null;
    }

    if (weight_grams !== undefined) {
      product.weight_grams = weight_grams ?? null;
    }

    if (stock_status !== undefined) {
      const allowedStatuses = ["IN_STOCK", "OUT_OF_STOCK", "ON_REQUEST"];

      if (!allowedStatuses.includes(stock_status)) {
        await transaction.rollback();

        return res.status(400).json({
          success: false,
          message: "Invalid stock status",
        });
      }

      product.stock_status = stock_status;
    }

    product.updated_by = req.user?.id || null;


    await product.save({
      transaction,
    });

    /*
     * REPLACE CATEGORIES
     */

    if (category_uuids !== undefined) {
      if (!Array.isArray(category_uuids)) {
        await transaction.rollback();

        return res.status(400).json({
          success: false,
          message: "category_uuids must be an array",
        });
      }

      const categories = await Category.findAll({
        where: {
          uuid: {
            [Op.in]: category_uuids,
          },
        },
        transaction,
      });

      if (categories.length !== category_uuids.length) {
        await transaction.rollback();

        return res.status(400).json({
          success: false,
          message: "One or more categories are invalid",
        });
      }

      await ProductCategory.destroy({
        where: {
          product_id: product.id,
        },
        transaction,
      });

      if (categories.length > 0) {
        await ProductCategory.bulkCreate(
          categories.map((category) => ({
            product_id: product.id,
            category_id: category.id,
          })),
          {
            transaction,
          },
        );
      }
    }

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

      if (images.length > 4) {
        await transaction.rollback();

        return res.status(400).json({
          success: false,
          message: "Maximum 4 images are allowed",
        });
      }

      for (const image of images) {
        if (!isValidImageDataUri(image.data_uri)) {
          await transaction.rollback();

          return res.status(400).json({
            success: false,
            message: "Invalid image Data URI",
          });
        }
      }

      await ProductImage.destroy({
        where: {
          product_id: product.id,
        },
        transaction,
      });

      if (images.length > 0) {
        await ProductImage.bulkCreate(
          images.map((image, index) => ({
            product_id: product.id,
            data_uri: image.data_uri,
            is_primary:
              image.is_primary !== undefined
                ? Boolean(image.is_primary)
                : index === 0,
          })),
          {
            transaction,
          },
        );
      }
    }

    await transaction.commit();

    const updatedProduct = await Product.findByPk(product.id, {
      include: [
        {
          model: ProductImage,
          as: "images",
        },

        {
          model: Category,
          as: "categories",
          through: {
            attributes: [],
          },
        },
      ],
    });

    return res.status(200).json({
      success: true,
      message: "Product updated successfully",
      data: updatedProduct,
    });
  } catch (error) {
    await transaction.rollback();

    console.error("Update product error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update product",
    });
  }
};

/*
 * DISABLE PRODUCT
 */

const deleteProduct = async (req, res) => {
  try {
    const { uuid } = req.params;

    const product = await Product.findOne({
      where: {
        uuid,
      },
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    product.is_active = false;

    await product.save();

    return res.status(200).json({
      success: true,
      message: "Product disabled successfully",
    });
  } catch (error) {
    console.error("Delete product error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to disable product",
    });
  }
};

const getSignatureProducts = async (req, res) => {
  try {
    const LIMIT = 4;

    /*
     * Find products receiving the most inquiries.
     */
    const inquiryProducts = await ProductInquiry.findAll({
      attributes: [
        "product_id",

        [sequelize.fn("COUNT", sequelize.col("product_id")), "inquiry_count"],
      ],

      group: ["product_id"],

      order: [[sequelize.literal("inquiry_count"), "DESC"]],

      limit: LIMIT,

      raw: true,
    });

    const popularProductIds = inquiryProducts.map((item) => item.product_id);

    let signatureProducts = [];

    /*
     * Load popular products
     */
    if (popularProductIds.length > 0) {
      const popularProducts = await Product.findAll({
        where: {
          id: {
            [Op.in]: popularProductIds,
          },

          is_active: true,
        },

        include: [
          {
            model: ProductImage,
            as: "images",
            required: false,
          },

          {
            model: Category,
            as: "categories",
            required: false,

            through: {
              attributes: [],
            },
          },
        ],

        order: [
          [
            {
              model: ProductImage,
              as: "images",
            },
            "sort_order",
            "ASC",
          ],
        ],
      });

      /*
       * Restore inquiry-count order.
       */
      signatureProducts = popularProductIds
        .map((id) =>
          popularProducts.find((product) => Number(product.id) === Number(id)),
        )
        .filter(Boolean);
    }

    /*
     * If we don't yet have 4,
     * fill the remaining places randomly.
     */
    const remaining = LIMIT - signatureProducts.length;

    if (remaining > 0) {
      const excludedIds = signatureProducts.map((product) => product.id);

      const randomWhere = {
        is_active: true,
      };

      if (excludedIds.length > 0) {
        randomWhere.id = {
          [Op.notIn]: excludedIds,
        };
      }

      const randomProducts = await Product.findAll({
        where: randomWhere,

        include: [
          {
            model: ProductImage,
            as: "images",
            required: false,
          },

          {
            model: Category,
            as: "categories",
            required: false,

            through: {
              attributes: [],
            },
          },
        ],

        order: [sequelize.random()],

        limit: remaining,
      });

      signatureProducts = [...signatureProducts, ...randomProducts];
    }

    return res.status(200).json({
      success: true,

      data: signatureProducts.slice(0, LIMIT),
    });
  } catch (error) {
    console.error("Signature products error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch signature products",
    });
  }
};

module.exports = {
  createProduct,
  getProducts,
  getProductBySlug,
  updateProduct,
  deleteProduct,
  getSignatureProducts,
};
