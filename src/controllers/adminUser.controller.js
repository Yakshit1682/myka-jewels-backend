const { Op } = require("sequelize");

const { User, Role } = require("../models");

const getUsers = async (req, res) => {
  try {
    const { search, status, page = 1, limit = 20 } = req.query;

    const safePage = Math.max(Number(page) || 1, 1);

    const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);

    const offset = (safePage - 1) * safeLimit;

    const where = {};

    if (status === "active") {
      where.is_active = true;
    }

    if (status === "inactive") {
      where.is_active = false;
    }

    if (search?.trim()) {
      const value = search.trim();

      where[Op.or] = [
        {
          first_name: {
            [Op.like]: `%${value}%`,
          },
        },

        {
          last_name: {
            [Op.like]: `%${value}%`,
          },
        },

        {
          email: {
            [Op.like]: `%${value}%`,
          },
        },

        {
          phone: {
            [Op.like]: `%${value}%`,
          },
        },
      ];
    }

    const { count, rows } = await User.findAndCountAll({
      where,

      attributes: {
        exclude: ["password_hash"],
      },

      include: [
        {
          model: Role,
          as: "roles",

          attributes: ["id", "name"],

          through: {
            attributes: [],
          },
        },
      ],

      order: [["created_at", "DESC"]],

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
    console.error("Get admin users error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch users",
    });
  }
};

const getUserByUuid = async (req, res) => {
  try {
    const { uuid } = req.params;

    const user = await User.findOne({
      where: {
        uuid,
      },

      attributes: {
        exclude: ["password_hash"],
      },

      include: [
        {
          model: Role,
          as: "roles",

          attributes: ["id", "name"],

          through: {
            attributes: [],
          },
        },
      ],
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error("Get admin user error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch user",
    });
  }
};

const updateUserStatus = async (req, res) => {
  try {
    const { uuid } = req.params;

    const { is_active } = req.body;

    if (typeof is_active !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "is_active must be boolean",
      });
    }

    const user = await User.findOne({
      where: {
        uuid,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    /*
     * Don't let an admin disable
     * their own account accidentally.
     */
    if (user.id === req.user.id && is_active === false) {
      return res.status(400).json({
        success: false,
        message: "You cannot disable your own account",
      });
    }

    user.is_active = is_active;

    await user.save();

    return res.status(200).json({
      success: true,

      message: is_active
        ? "User activated successfully"
        : "User disabled successfully",

      data: {
        uuid: user.uuid,
        is_active: user.is_active,
      },
    });
  } catch (error) {
    console.error("Update user status error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update user",
    });
  }
};

module.exports = {
  getUsers,
  getUserByUuid,
  updateUserStatus,
};
