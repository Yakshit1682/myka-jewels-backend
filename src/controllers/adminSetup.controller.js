const { User, Role, UserRole } = require("../models");

const { hashPassword } = require("../utils/hash");

const createAdmin = async (req, res) => {
  try {
    const setupSecret = req.headers["x-admin-setup-secret"];

    if (!setupSecret || setupSecret !== process.env.ADMIN_SETUP_SECRET) {
      return res.status(403).json({
        success: false,
        message: "Invalid setup secret",
      });
    }

    const { first_name, last_name, email, phone, password } = req.body;

    const normalizedEmail = email?.trim().toLowerCase();

    if (!first_name?.trim() || !normalizedEmail || !password) {
      return res.status(400).json({
        success: false,
        message: "First name, email and password are required",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters long",
      });
    }

    /*
     * Optional but recommended:
     * only allow creation of the first ADMIN.
     */
    const adminRole = await Role.findOne({
      where: {
        name: "ADMIN",
      },
    });

    if (!adminRole) {
      return res.status(500).json({
        success: false,
        message: "ADMIN role not found",
      });
    }

    const existingAdmin = await User.findOne({
      include: [
        {
          model: Role,
          as: "roles",

          where: {
            name: "ADMIN",
          },

          through: {
            attributes: [],
          },
        },
      ],
    });

    if (existingAdmin) {
      return res.status(409).json({
        success: false,
        message: "Admin account already exists",
      });
    }

    const existingUser = await User.findOne({
      where: {
        email: normalizedEmail,
      },
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Email already exists",
      });
    }

    const password_hash = await hashPassword(password);

    const user = await User.create({
      first_name: first_name.trim(),

      last_name: last_name?.trim() || null,

      email: normalizedEmail,

      phone: phone?.trim() || null,

      password_hash,

      is_active: true,
    });

    await UserRole.create({
      user_id: user.id,
      role_id: adminRole.id,
    });

    return res.status(201).json({
      success: true,
      message: "Admin account created successfully",

      data: {
        uuid: user.uuid,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        roles: ["ADMIN"],
      },
    });
  } catch (error) {
    console.error("Create admin error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to create admin account",
    });
  }
};

module.exports = {
  createAdmin,
};
