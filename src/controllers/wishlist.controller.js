const { WishlistItem, Product, ProductImage, Category } = require("../models");

const addToWishlist = async (req, res) => {
  try {
    const { product_uuid } = req.body;

    if (!product_uuid) {
      return res.status(400).json({
        success: false,
        message: "product_uuid is required",
      });
    }

    const product = await Product.findOne({
      where: {
        uuid: product_uuid,
        is_active: true,
      },
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const existing = await WishlistItem.findOne({
      where: {
        user_id: req.user.id,
        product_id: product.id,
      },
    });

    if (existing) {
      return res.status(200).json({
        success: true,
        message: "Product already in wishlist",
      });
    }

    await WishlistItem.create({
      user_id: req.user.id,
      product_id: product.id,
    });

    return res.status(201).json({
      success: true,
      message: "Product added to wishlist",
    });
  } catch (error) {
    console.error("Add wishlist error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to add product to wishlist",
    });
  }
};

const getWishlist = async (req, res) => {
  try {
    const items = await WishlistItem.findAll({
      where: {
        user_id: req.user.id,
      },

      include: [
        {
          model: Product,
          as: "product",

          where: {
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
              through: {
                attributes: [],
              },
              required: false,
            },
          ],
        },
      ],

      order: [["created_at", "DESC"]],
    });

    return res.status(200).json({
      success: true,
      data: items,
    });
  } catch (error) {
    console.error("Get wishlist error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch wishlist",
    });
  }
};

const removeFromWishlist = async (req, res) => {
  try {
    const { product_uuid } = req.params;

    const product = await Product.findOne({
      where: {
        uuid: product_uuid,
      },
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const deleted = await WishlistItem.destroy({
      where: {
        user_id: req.user.id,
        product_id: product.id,
      },
    });

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Product not found in wishlist",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Product removed from wishlist",
    });
  } catch (error) {
    console.error("Remove wishlist error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to remove product from wishlist",
    });
  }
};

module.exports = {
  addToWishlist,
  getWishlist,
  removeFromWishlist,
};
