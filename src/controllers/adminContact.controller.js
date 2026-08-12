// src/controllers/adminContact.controller.js

const { Op } = require("sequelize");

const { ContactFormSubmission } = require("../models");

const getContacts = async (req, res) => {
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
          first_name: {
            [Op.like]: `%${search.trim()}%`,
          },
        },

        {
          last_name: {
            [Op.like]: `%${search.trim()}%`,
          },
        },

        {
          email: {
            [Op.like]: `%${search.trim()}%`,
          },
        },

        {
          phone: {
            [Op.like]: `%${search.trim()}%`,
          },
        },

        {
          subject: {
            [Op.like]: `%${search.trim()}%`,
          },
        },
      ];
    }

    const { count, rows } = await ContactFormSubmission.findAndCountAll({
      where,

      order: [["created_at", "DESC"]],

      limit: safeLimit,
      offset,
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
    console.error("Get contacts error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch contact submissions",
    });
  }
};

const getContactByUuid = async (req, res) => {
  try {
    const { uuid } = req.params;

    const contact = await ContactFormSubmission.findOne({
      where: {
        uuid,
      },
    });

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: "Contact submission not found",
      });
    }

    /*
     * Automatically mark as READ.
     */
    if (contact.status === "NEW") {
      contact.status = "READ";

      await contact.save();
    }

    return res.status(200).json({
      success: true,
      data: contact,
    });
  } catch (error) {
    console.error("Get contact error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch contact submission",
    });
  }
};

const updateContact = async (req, res) => {
  try {
    const { uuid } = req.params;

    const { status, admin_notes } = req.body;

    const contact = await ContactFormSubmission.findOne({
      where: {
        uuid,
      },
    });

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: "Contact submission not found",
      });
    }

    if (status !== undefined) {
      const allowedStatuses = ["NEW", "READ", "RESPONDED", "CLOSED"];

      const normalizedStatus = status.toUpperCase();

      if (!allowedStatuses.includes(normalizedStatus)) {
        return res.status(400).json({
          success: false,
          message: "Invalid contact status",
        });
      }

      contact.status = normalizedStatus;
    }

    if (admin_notes !== undefined) {
      contact.admin_notes = admin_notes?.trim() || null;
    }

    await contact.save();

    return res.status(200).json({
      success: true,
      message: "Contact submission updated successfully",

      data: contact,
    });
  } catch (error) {
    console.error("Update contact error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update contact submission",
    });
  }
};

module.exports = {
  getContacts,
  getContactByUuid,
  updateContact,
};
