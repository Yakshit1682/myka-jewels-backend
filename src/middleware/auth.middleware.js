const { User, Role, UserSession } = require("../models");

const { verifyAccessToken, hashToken } = require("../utils/token");

const authMiddleware = async (req, res, next) => {
  try {
    const authorization = req.headers.authorization;

    if (!authorization) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const [type, token] = authorization.split(" ");

    if (type !== "Bearer" || !token) {
      return res.status(401).json({
        success: false,
        message: "Invalid authorization format",
      });
    }

    let payload;

    try {
      payload = verifyAccessToken(token);
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token",
      });
    }

    const tokenHash = hashToken(token);

    const session = await UserSession.findOne({
      where: {
        token_hash: tokenHash,
        revoked_at: null,
      },
    });

    if (!session) {
      return res.status(401).json({
        success: false,
        message: "Session is no longer valid",
      });
    }

    if (new Date(session.expires_at) <= new Date()) {
      return res.status(401).json({
        success: false,
        message: "Session expired",
      });
    }

    const user = await User.findOne({
      where: {
        uuid: payload.user_uuid,
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
        message: "User not found or inactive",
      });
    }

    req.user = user;
    req.session = session;
    req.token = token;

    next();
  } catch (error) {
    console.error("Auth middleware error:", error);

    return res.status(500).json({
      success: false,
      message: "Authentication failed",
    });
  }
};

module.exports = authMiddleware;
