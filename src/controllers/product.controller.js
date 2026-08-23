const { Op } = require("sequelize");

const {
  Product,
  ProductImage,
  ProductCategory,
  ProductInquiry,
  Category,
  Collection,
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

      category_collections = [],

      images = [],
    } = req.body;

    /*
     * BASIC VALIDATION
     */

    if (!name?.trim()) {
      await transaction.rollback();

      return res.status(400).json({
        success: false,
        message: "Product name is required",
      });
    }

    if (!Array.isArray(category_collections)) {
      await transaction.rollback();

      return res.status(400).json({
        success: false,
        message: "category_collections must be an array",
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

    /*
     * VALIDATE CATEGORY / COLLECTION PAYLOAD
     */

    for (const item of category_collections) {
      if (!item.category_uuid) {
        await transaction.rollback();

        return res.status(400).json({
          success: false,
          message: "category_uuid is required",
        });
      }

      if (
        item.collection_uuids !== undefined &&
        !Array.isArray(item.collection_uuids)
      ) {
        await transaction.rollback();

        return res.status(400).json({
          success: false,
          message: "collection_uuids must be an array",
        });
      }
    }

    /*
     * VALIDATE IMAGES
     */

    for (const image of images) {
      if (!isValidImageDataUri(image.data_uri)) {
        await transaction.rollback();

        return res.status(400).json({
          success: false,
          message: "Invalid image Data URI",
        });
      }
    }

    /*
     * CREATE SLUG
     */

    let slug = createSlug(name);

    const existingSlug = await Product.findOne({
      where: {
        slug,
      },

      transaction,
    });

    if (existingSlug) {
      slug = `${slug}-${Date.now()}`;
    }

    /*
     * VALIDATE SKU
     */

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

    /*
     * CREATE PRODUCT
     */

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

    /*
     * CATEGORY + COLLECTION ASSIGNMENTS
     */

    if (category_collections.length > 0) {
      /*
       * Get all unique category UUIDs
       */
      const categoryUuids = [
        ...new Set(category_collections.map((item) => item.category_uuid)),
      ];

      const categories = await Category.findAll({
        where: {
          uuid: {
            [Op.in]: categoryUuids,
          },

          is_active: true,
        },

        transaction,
      });

      if (categories.length !== categoryUuids.length) {
        await transaction.rollback();

        return res.status(400).json({
          success: false,
          message: "One or more categories are invalid",
        });
      }

      /*
       * Get all unique collection UUIDs
       */
      const collectionUuids = [
        ...new Set(
          category_collections.flatMap((item) => item.collection_uuids || []),
        ),
      ];

      let collections = [];

      if (collectionUuids.length > 0) {
        collections = await Collection.findAll({
          where: {
            uuid: {
              [Op.in]: collectionUuids,
            },

            is_active: true,
          },

          transaction,
        });

        if (collections.length !== collectionUuids.length) {
          await transaction.rollback();

          return res.status(400).json({
            success: false,
            message: "One or more collections are invalid",
          });
        }
      }

      /*
       * Map UUIDs to numeric database IDs
       */

      const categoryMap = new Map(
        categories.map((category) => [category.uuid, category.id]),
      );

      const collectionMap = new Map(
        collections.map((collection) => [collection.uuid, collection.id]),
      );

      const productCategoryRows = [];

      /*
       * Build product_categories records
       */

      for (const item of category_collections) {
        const categoryId = categoryMap.get(item.category_uuid);

        const selectedCollections = [...new Set(item.collection_uuids || [])];

        /*
         * Category selected without any collection
         */
        if (selectedCollections.length === 0) {
          productCategoryRows.push({
            product_id: product.id,

            category_id: categoryId,

            collection_id: null,

            is_primary: false,
          });

          continue;
        }

        /*
         * Same category can have multiple collections
         */
        for (const collectionUuid of selectedCollections) {
          productCategoryRows.push({
            product_id: product.id,

            category_id: categoryId,

            collection_id: collectionMap.get(collectionUuid),

            is_primary: false,
          });
        }
      }

      await ProductCategory.bulkCreate(productCategoryRows, {
        transaction,
      });
    }

    /*
     * PRODUCT IMAGES
     */

    if (images.length > 0) {
      await ProductImage.bulkCreate(
        images.map((image, index) => ({
          product_id: product.id,

          data_uri: image.data_uri,

          sort_order:
            Number(image.sort_order) >= 1
              ? Number(image.sort_order)
              : index + 1,

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

    /*
     * FETCH CREATED PRODUCT
     */

    const createdProduct = await Product.findByPk(product.id, {
      include: [
        {
          model: ProductImage,
          as: "images",
        },

        {
          model: ProductCategory,
          as: "product_categories",

          attributes: ["id", "category_id", "collection_id", "is_primary"],

          include: [
            {
              model: Category,
              as: "category",

              attributes: ["uuid", "name", "slug", "parent_id"],
            },

            {
              model: Collection,
              as: "collection",

              attributes: ["uuid", "name", "slug"],

              required: false,
            },
          ],
        },
      ],
    });

    return res.status(201).json({
      success: true,

      message: "Product created successfully",

      data: createdProduct,
    });
  } catch (error) {
    /*
     * Only rollback if transaction
     * hasn't already been committed.
     */
    if (!transaction.finished) {
      await transaction.rollback();
    }

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
    const {
      category,
      collection,
      featured,
      search,
      stock_status,
      min_price,
      max_price,
      sort = "featured",
      page = 1,
      limit = 12,
    } = req.query;

    const safePage = Math.max(Number(page) || 1, 1);

    const safeLimit = Math.min(Math.max(Number(limit) || 12, 1), 50);

    const offset = (safePage - 1) * safeLimit;

    /*
    |--------------------------------------------------------------------------
    | PRODUCT WHERE
    |--------------------------------------------------------------------------
    */

    const productWhere = {
      is_active: true,
    };

    /*
     * FEATURED
     */

    if (featured === "true") {
      productWhere.is_featured = true;
    }

    /*
     * STOCK STATUS
     */

    if (
      stock_status &&
      ["IN_STOCK", "OUT_OF_STOCK", "ON_REQUEST"].includes(stock_status)
    ) {
      productWhere.stock_status = stock_status;
    }

    /*
     * PRICE RANGE
     */

    if (min_price !== undefined || max_price !== undefined) {
      productWhere.price = {};

      if (min_price !== undefined && min_price !== "") {
        const min = Number(min_price);

        if (!Number.isNaN(min)) {
          productWhere.price[Op.gte] = min;
        }
      }

      if (max_price !== undefined && max_price !== "") {
        const max = Number(max_price);

        if (!Number.isNaN(max)) {
          productWhere.price[Op.lte] = max;
        }
      }
    }

    /*
    |--------------------------------------------------------------------------
    | CATEGORY + COLLECTION
    |--------------------------------------------------------------------------
    */

    const productCategoryInclude = {
      model: ProductCategory,

      as: "product_categories",

      attributes: ["id", "category_id", "collection_id", "is_primary"],

      /*
       * Required if filtering specifically
       * by category/collection.
       *
       * Also required while searching so
       * Sequelize can search joined fields.
       */
      required: Boolean(category || collection || search?.trim()),

      include: [
        /*
         * CATEGORY
         */
        {
          model: Category,

          as: "category",

          attributes: ["uuid", "name", "slug", "parent_id"],

          required: Boolean(category),

          ...(category
            ? {
                where: {
                  slug: category,

                  is_active: true,
                },
              }
            : {}),
        },

        /*
         * COLLECTION
         */
        {
          model: Collection,

          as: "collection",

          attributes: ["uuid", "name", "slug", "description", "image_data_uri"],

          required: Boolean(collection),

          ...(collection
            ? {
                where: {
                  slug: collection,

                  is_active: true,
                },
              }
            : {}),
        },
      ],
    };

    /*
    |--------------------------------------------------------------------------
    | SEARCH
    |--------------------------------------------------------------------------
    |
    | Product + Category + Collection
    |
    */

    if (search?.trim()) {
      const searchValue = search.trim();

      productWhere[Op.or] = [
        /*
         * PRODUCT
         */

        {
          name: {
            [Op.like]: `%${searchValue}%`,
          },
        },

        {
          sku: {
            [Op.like]: `%${searchValue}%`,
          },
        },

        {
          short_description: {
            [Op.like]: `%${searchValue}%`,
          },
        },

        {
          description: {
            [Op.like]: `%${searchValue}%`,
          },
        },

        {
          material: {
            [Op.like]: `%${searchValue}%`,
          },
        },

        {
          metal_color: {
            [Op.like]: `%${searchValue}%`,
          },
        },

        /*
         * CATEGORY
         */

        {
          "$product_categories.category.name$": {
            [Op.like]: `%${searchValue}%`,
          },
        },

        {
          "$product_categories.category.slug$": {
            [Op.like]: `%${searchValue}%`,
          },
        },

        /*
         * COLLECTION
         */

        {
          "$product_categories.collection.name$": {
            [Op.like]: `%${searchValue}%`,
          },
        },

        {
          "$product_categories.collection.slug$": {
            [Op.like]: `%${searchValue}%`,
          },
        },
      ];
    }

    /*
    |--------------------------------------------------------------------------
    | SORT
    |--------------------------------------------------------------------------
    */

    let order = [];

    switch (sort) {
      case "newest":
        order = [["created_at", "DESC"]];
        break;

      case "price_asc":
        order = [
          ["price", "ASC"],
          ["created_at", "DESC"],
        ];
        break;

      case "price_desc":
        order = [
          ["price", "DESC"],
          ["created_at", "DESC"],
        ];
        break;

      case "featured":
      default:
        order = [
          ["is_featured", "DESC"],
          ["created_at", "DESC"],
        ];
        break;
    }

    /*
    |--------------------------------------------------------------------------
    | QUERY
    |--------------------------------------------------------------------------
    */

    const { count, rows } = await Product.findAndCountAll({
      where: productWhere,

      include: [
        /*
         * PRIMARY IMAGE
         */
        {
          model: ProductImage,

          as: "images",

          where: {
            is_primary: true,
          },

          required: false,
        },

        /*
         * CATEGORY /
         * COLLECTION
         */
        productCategoryInclude,
      ],

      /*
       * IMPORTANT
       *
       * Needed because we're searching
       * nested joined model fields such as:
       *
       * $product_categories.collection.name$
       */
      subQuery: false,

      distinct: true,

      limit: safeLimit,

      offset,

      order,
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
          model: ProductCategory,
          as: "product_categories",

          required: false,

          attributes: ["id", "category_id", "collection_id", "is_primary"],

          include: [
            {
              model: Category,
              as: "category",

              required: false,

              attributes: ["uuid", "name", "slug", "parent_id"],
            },

            {
              model: Collection,
              as: "collection",

              required: false,

              attributes: [
                "uuid",
                "name",
                "slug",
                "description",
                "image_data_uri",
              ],
            },
          ],
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
      metal_color,
      price,
      compare_at_price,
      weight_grams,
      stock_status,
      is_featured,
      is_active,

      category_collections,

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

    /*
    |--------------------------------------------------------------------------
    | PRODUCT BASIC DATA
    |--------------------------------------------------------------------------
    */

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

    /*
    |--------------------------------------------------------------------------
    | SKU
    |--------------------------------------------------------------------------
    */

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

    /*
    |--------------------------------------------------------------------------
    | TEXT FIELDS
    |--------------------------------------------------------------------------
    */

    if (short_description !== undefined) {
      product.short_description = short_description?.trim() || null;
    }

    if (description !== undefined) {
      product.description = description?.trim() || null;
    }

    if (material !== undefined) {
      product.material = material?.trim() || null;
    }

    if (metal_color !== undefined) {
      product.metal_color = metal_color?.trim() || null;
    }

    /*
    |--------------------------------------------------------------------------
    | PRICE / WEIGHT
    |--------------------------------------------------------------------------
    */

    if (price !== undefined) {
      product.price = price ?? null;
    }

    if (compare_at_price !== undefined) {
      product.compare_at_price = compare_at_price ?? null;
    }

    if (weight_grams !== undefined) {
      product.weight_grams = weight_grams ?? null;
    }

    /*
    |--------------------------------------------------------------------------
    | FEATURED / ACTIVE
    |--------------------------------------------------------------------------
    */

    if (is_featured !== undefined) {
      product.is_featured = Boolean(is_featured);
    }

    if (is_active !== undefined) {
      product.is_active = Boolean(is_active);
    }

    /*
    |--------------------------------------------------------------------------
    | STOCK STATUS
    |--------------------------------------------------------------------------
    */

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
    |--------------------------------------------------------------------------
    | REPLACE CATEGORY + COLLECTION MAPPINGS
    |--------------------------------------------------------------------------
    */

    if (category_collections !== undefined) {
      if (!Array.isArray(category_collections)) {
        await transaction.rollback();

        return res.status(400).json({
          success: false,
          message: "category_collections must be an array",
        });
      }

      /*
       * Validate payload structure.
       */
      for (const item of category_collections) {
        if (!item.category_uuid) {
          await transaction.rollback();

          return res.status(400).json({
            success: false,
            message: "category_uuid is required",
          });
        }

        if (
          item.collection_uuids !== undefined &&
          !Array.isArray(item.collection_uuids)
        ) {
          await transaction.rollback();

          return res.status(400).json({
            success: false,
            message: "collection_uuids must be an array",
          });
        }
      }

      /*
       * Unique category UUIDs.
       */
      const categoryUuids = [
        ...new Set(category_collections.map((item) => item.category_uuid)),
      ];

      /*
       * Get actual category records.
       */
      const categories =
        categoryUuids.length > 0
          ? await Category.findAll({
              where: {
                uuid: {
                  [Op.in]: categoryUuids,
                },

                is_active: true,
              },

              transaction,
            })
          : [];

      if (categories.length !== categoryUuids.length) {
        await transaction.rollback();

        return res.status(400).json({
          success: false,
          message: "One or more categories are invalid",
        });
      }

      /*
       * Unique collection UUIDs from
       * every category.
       */
      const collectionUuids = [
        ...new Set(
          category_collections.flatMap((item) => item.collection_uuids || []),
        ),
      ];

      /*
       * Get actual collection records.
       */
      const collections =
        collectionUuids.length > 0
          ? await Collection.findAll({
              where: {
                uuid: {
                  [Op.in]: collectionUuids,
                },

                is_active: true,
              },

              transaction,
            })
          : [];

      if (collections.length !== collectionUuids.length) {
        await transaction.rollback();

        return res.status(400).json({
          success: false,
          message: "One or more collections are invalid",
        });
      }

      /*
       * UUID -> DB ID maps.
       */
      const categoryMap = new Map(
        categories.map((category) => [category.uuid, category.id]),
      );

      const collectionMap = new Map(
        collections.map((collection) => [collection.uuid, collection.id]),
      );

      /*
       * Remove old mapping rows.
       *
       * Since this is a junction table,
       * force:true avoids old soft-deleted
       * combinations causing duplicate issues.
       */
      await ProductCategory.destroy({
        where: {
          product_id: product.id,
        },

        force: true,

        transaction,
      });

      const productCategoryRows = [];

      /*
       * Recreate category + collection mappings.
       */
      for (const item of category_collections) {
        const categoryId = categoryMap.get(item.category_uuid);

        const selectedCollections = [...new Set(item.collection_uuids || [])];

        /*
         * Category selected with
         * no collection.
         */
        if (selectedCollections.length === 0) {
          productCategoryRows.push({
            product_id: product.id,

            category_id: categoryId,

            collection_id: null,

            is_primary: false,
          });

          continue;
        }

        /*
         * Category selected with
         * multiple collections.
         */
        for (const collectionUuid of selectedCollections) {
          productCategoryRows.push({
            product_id: product.id,

            category_id: categoryId,

            collection_id: collectionMap.get(collectionUuid),

            is_primary: false,
          });
        }
      }

      if (productCategoryRows.length > 0) {
        await ProductCategory.bulkCreate(productCategoryRows, {
          transaction,
        });
      }
    }

    /*
    |--------------------------------------------------------------------------
    | REPLACE IMAGES
    |--------------------------------------------------------------------------
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

      /*
       * Remove old images.
       */
      await ProductImage.destroy({
        where: {
          product_id: product.id,
        },

        force: true,

        transaction,
      });

      /*
       * Add new images.
       */
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
    }

    /*
    |--------------------------------------------------------------------------
    | COMMIT
    |--------------------------------------------------------------------------
    */

    await transaction.commit();

    /*
    |--------------------------------------------------------------------------
    | FETCH UPDATED PRODUCT
    |--------------------------------------------------------------------------
    */

    const updatedProduct = await Product.findByPk(product.id, {
      include: [
        {
          model: ProductImage,

          as: "images",
        },

        {
          model: ProductCategory,

          as: "product_categories",

          attributes: ["id", "category_id", "collection_id", "is_primary"],

          include: [
            {
              model: Category,

              as: "category",

              attributes: ["uuid", "name", "slug", "parent_id"],
            },

            {
              model: Collection,

              as: "collection",

              attributes: ["uuid", "name", "slug"],

              required: false,
            },
          ],
        },
      ],
    });

    return res.status(200).json({
      success: true,

      message: "Product updated successfully",

      data: updatedProduct,
    });
  } catch (error) {
    /*
     * Avoid rollback error if transaction
     * was already committed.
     */
    if (!transaction.finished) {
      await transaction.rollback();
    }

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
