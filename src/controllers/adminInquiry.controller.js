// src/controllers/adminInquiry.controller.js

const { Op } = require("sequelize");

const { ProductInquiry, Product, User } = require("../models");

const getInquiries = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;

    const safePage = Math.max(Number(page) || 1, 1);

    const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);

    const offset = (safePage - 1) * safeLimit;

    const where = {};

    if (status) {
      where.status = status.toUpperCase();
    }

    if (search?.trim()) {
      where[Op.or] = [
        {
          customer_name: {
            [Op.like]: `%${search.trim()}%`,
          },
        },

        {
          customer_email: {
            [Op.like]: `%${search.trim()}%`,
          },
        },

        {
          customer_phone: {
            [Op.like]: `%${search.trim()}%`,
          },
        },
      ];
    }

    const { count, rows } = await ProductInquiry.findAndCountAll({
      where,

      include: [
        {
          model: Product,
          as: "product",

          attributes: ["uuid", "name", "slug", "sku", "price"],
        },

        {
          model: User,
          as: "user",

          attributes: ["uuid", "first_name", "last_name", "email", "phone"],
        },
      ],

      order: [["clicked_at", "DESC"]],

      limit: safeLimit,
      offset,

      distinct: true,
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
    console.error("Admin inquiries error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch inquiries",
    });
  }
};

const getInquiryByUuid = async (req, res) => {
  try {
    const { uuid } = req.params;

    const inquiry = await ProductInquiry.findOne({
      where: {
        uuid,
      },

      include: [
        {
          model: Product,
          as: "product",
        },

        {
          model: User,
          as: "user",

          attributes: ["uuid", "first_name", "last_name", "email", "phone"],
        },
      ],
    });

    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: "Inquiry not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: inquiry,
    });
  } catch (error) {
    console.error("Get inquiry error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch inquiry",
    });
  }
};

const updateInquiry = async (req, res) => {
  try {
    const { uuid } = req.params;

    const { status, admin_notes } = req.body;

    const inquiry = await ProductInquiry.findOne({
      where: {
        uuid,
      },
    });

    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: "Inquiry not found",
      });
    }

    if (status !== undefined) {
      const allowedStatuses = ["CLICKED", "CONTACTED", "CLOSED"];

      const normalizedStatus = status.toUpperCase();

      if (!allowedStatuses.includes(normalizedStatus)) {
        return res.status(400).json({
          success: false,
          message: "Invalid inquiry status",
        });
      }

      inquiry.status = normalizedStatus;
    }

    if (admin_notes !== undefined) {
      inquiry.admin_notes = admin_notes?.trim() || null;
    }

    await inquiry.save();

    return res.status(200).json({
      success: true,
      message: "Inquiry updated successfully",

      data: inquiry,
    });
  } catch (error) {
    console.error("Update inquiry error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update inquiry",
    });
  }
};

module.exports = {
  getInquiries,
  getInquiryByUuid,
  updateInquiry,
};
