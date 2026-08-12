const {
  Product,
  ProductInquiry,
  ContactFormSubmission,
  User,
} = require("../models");

const getDashboardStats = async (req, res) => {
  try {
    const [
      totalProducts,
      totalInquiries,
      newInquiries,
      totalContacts,
      newContacts,
      totalUsers,
      recentInquiries,
      recentProducts,
    ] = await Promise.all([
      Product.count({
        where: {
          is_active: true,
        },
      }),

      ProductInquiry.count(),

      ProductInquiry.count({
        where: {
          status: "CLICKED",
        },
      }),

      ContactFormSubmission.count(),

      ContactFormSubmission.count({
        where: {
          status: "NEW",
        },
      }),

      User.count(),

      ProductInquiry.findAll({
        limit: 5,

        order: [["clicked_at", "DESC"]],

        include: [
          {
            model: Product,
            as: "product",

            attributes: ["uuid", "name", "sku", "price"],
          },

          {
            model: User,
            as: "user",

            attributes: ["uuid", "first_name", "last_name", "email", "phone"],
          },
        ],
      }),

      Product.findAll({
        where: {
          is_active: true,
        },

        limit: 5,

        order: [["created_at", "DESC"]],

        attributes: [
          "uuid",
          "name",
          "sku",
          "price",
          "stock_status",
          "is_featured",
          "created_at",
        ],
      }),
    ]);

    return res.status(200).json({
      success: true,

      data: {
        stats: {
          total_products: totalProducts,
          total_inquiries: totalInquiries,
          new_inquiries: newInquiries,

          total_contacts: totalContacts,
          new_contacts: newContacts,

          total_users: totalUsers,
        },

        recent_inquiries: recentInquiries,

        recent_products: recentProducts,
      },
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load dashboard",
    });
  }
};

module.exports = {
  getDashboardStats,
};
