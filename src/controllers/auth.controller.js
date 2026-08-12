const {
  User,
  Role,
  UserRole,
  UserSession,
  PasswordResetToken,
} = require("../models");

const { hashPassword, comparePassword } = require("../utils/hash");

const {
  createAccessToken,
  hashToken,
  generateResetToken,
} = require("../utils/token");
const {
  isValidEmail,
  isValidPhone,
  normalizeEmail,
} = require("../utils/validation");


const register = async (req, res) => {
  try {
    const { first_name, last_name, email, phone, password } = req.body;

    const normalizedEmail = email?.trim().toLowerCase();
    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email address",
      });
    }

    if (!isValidPhone(phone)) {
      return res.status(400).json({
        success: false,
        message: "Invalid phone number",
      });
    }

    const normalizedPhone = phone?.trim() || null;
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

    const userRole = await Role.findOne({
      where: {
        name: "USER",
      },
    });

    if (!userRole) {
      return res.status(500).json({
        success: false,
        message: "USER role not found",
      });
    }

    const existingEmail = await User.findOne({
      where: {
        email: normalizedEmail,
      },
    });

    if (existingEmail) {
      return res.status(409).json({
        success: false,
        message: "Email already exists",
      });
    }

    if (normalizedPhone) {
      const existingPhone = await User.findOne({
        where: {
          phone: normalizedPhone,
        },
      });

      if (existingPhone) {
        return res.status(409).json({
          success: false,
          message: "Phone number already exists",
        });
      }
    }

    const password_hash = await hashPassword(password);

    const user = await User.create({
      first_name: first_name.trim(),
      last_name: last_name?.trim() || null,
      email: normalizedEmail,
      phone: normalizedPhone,
      password_hash,
    });

    await UserRole.create({
      user_id: user.id,
      role_id: userRole.id,
    });

    return res.status(201).json({
      success: true,
      message: "User registered successfully",

      data: {
        uuid: user.uuid,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        phone: user.phone,
      },
    });
  } catch (error) {
    console.error("Register error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to register user",
    });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const normalizedEmail = email?.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const user = await User.findOne({
      where: {
        email: normalizedEmail,
        is_active: true,
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
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const validPassword = await comparePassword(password, user.password_hash);

    if (!validPassword) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const roles = user.roles.map((role) => role.name);

    const token = createAccessToken({
      user_uuid: user.uuid,
      roles,
    });

    const token_hash = hashToken(token);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await UserSession.create({
      user_id: user.id,
      token_hash,
      ip_address: req.ip || null,
      user_agent: req.get("user-agent") || null,
      expires_at: expiresAt,
    });

    user.last_login_at = new Date();

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Login successful",

      data: {
        token,

        user: {
          uuid: user.uuid,
          first_name: user.first_name,
          last_name: user.last_name,
          email: user.email,
          phone: user.phone,
          roles,
        },
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to login",
    });
  }
};

const me = async (req, res) => {
  try {
    const user = req.user;

    return res.status(200).json({
      success: true,

      data: {
        uuid: user.uuid,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        phone: user.phone,

        roles: user.roles.map((role) => role.name),

        created_at: user.created_at,
        last_login_at: user.last_login_at,
      },
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch user profile",
    });
  }
};

const logout = async (req, res) => {
  try {
    const session = req.session;

    session.revoked_at = new Date();

    await session.save();

    return res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Unable to logout",
    });
  }
};

const logoutAll = async (req, res) => {
  try {
    await UserSession.update(
      {
        revoked_at: new Date(),
      },
      {
        where: {
          user_id: req.user.id,
          revoked_at: null,
        },
      },
    );

    return res.status(200).json({
      success: true,
      message: "Logged out from all devices",
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Unable to logout from all devices",
    });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const normalizedEmail = email?.trim().toLowerCase();

    if (!normalizedEmail) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const user = await User.findOne({
      where: {
        email: normalizedEmail,
        is_active: true,
      },
    });

    /*
     * Don't reveal whether an account exists.
     */
    if (!user) {
      return res.status(200).json({
        success: true,
        message:
          "If an account exists with this email, a password reset link has been generated.",
      });
    }

    /*
     * Invalidate previous unused reset tokens.
     */
    await PasswordResetToken.update(
      {
        used_at: new Date(),
      },
      {
        where: {
          user_id: user.id,
          used_at: null,
        },
      },
    );

    const resetToken = generateResetToken();

    const tokenHash = hashToken(resetToken);

    const expiresAt = new Date();

    expiresAt.setMinutes(expiresAt.getMinutes() + 30);

    await PasswordResetToken.create({
      user_id: user.id,
      token_hash: tokenHash,
      expires_at: expiresAt,
    });

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    /*
     * DEVELOPMENT ONLY:
     *
     * Later we'll email resetUrl.
     */
    console.log("Password reset URL:", resetUrl);

    return res.status(200).json({
      success: true,
      message:
        "If an account exists with this email, a password reset link has been generated.",

      /*
       * Remove this in production.
       */
      reset_url: process.env.NODE_ENV === "development" ? resetUrl : undefined,
    });
  } catch (error) {
    console.error("Forgot password error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to process password reset request",
    });
  }
};


const resetPassword = async (req, res) => {
  try {
    const { token, password, confirm_password } = req.body;

    if (!token || !password || !confirm_password) {
      return res.status(400).json({
        success: false,
        message: "Token, password and confirm password are required",
      });
    }

    if (password !== confirm_password) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters long",
      });
    }

    const tokenHash = hashToken(token);

    const resetToken = await PasswordResetToken.findOne({
      where: {
        token_hash: tokenHash,
        used_at: null,
      },
    });

    if (!resetToken) {
      return res.status(400).json({
        success: false,
        message: "Invalid or already used reset token",
      });
    }

    if (new Date(resetToken.expires_at) <= new Date()) {
      return res.status(400).json({
        success: false,
        message: "Reset token has expired",
      });
    }

    const user = await User.findByPk(resetToken.user_id);

    if (!user || !user.is_active) {
      return res.status(400).json({
        success: false,
        message: "Unable to reset password",
      });
    }

    user.password_hash = await hashPassword(password);

    await user.save();

    resetToken.used_at = new Date();

    await resetToken.save();

    /*
     * Logout all current sessions after password reset.
     */
    await UserSession.update(
      {
        revoked_at: new Date(),
      },
      {
        where: {
          user_id: user.id,
          revoked_at: null,
        },
      },
    );

    return res.status(200).json({
      success: true,
      message: "Password reset successfully. Please login again.",
    });
  } catch (error) {
    console.error("Reset password error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to reset password",
    });
  }
};
module.exports = {
  register,
  login,
  me,
  logout,
  logoutAll,
  forgotPassword,
  resetPassword,
};
