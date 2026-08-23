const { DataTypes } = require("sequelize");

const sequelize = require("../config/database");

const HomeBanner = sequelize.define(
  "HomeBanner",
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,

      primaryKey: true,

      autoIncrement: true,
    },

    uuid: {
      type: DataTypes.UUID,

      allowNull: false,

      unique: true,

      defaultValue: DataTypes.UUIDV4,
    },

    title: {
      type: DataTypes.STRING(180),

      allowNull: true,
    },

    subtitle: {
      type: DataTypes.STRING(255),

      allowNull: true,
    },

    description: {
      type: DataTypes.TEXT,

      allowNull: true,
    },

    type: {
      type: DataTypes.ENUM("BANNER", "CAROUSEL"),

      allowNull: false,

      defaultValue: "BANNER",
    },

    button_text: {
      type: DataTypes.STRING(100),

      allowNull: true,
    },

    button_url: {
      type: DataTypes.STRING(500),

      allowNull: true,
    },

    sort_order: {
      type: DataTypes.INTEGER,

      allowNull: false,

      defaultValue: 0,
    },

    is_active: {
      type: DataTypes.BOOLEAN,

      allowNull: false,

      defaultValue: true,
    },

    starts_at: {
      type: DataTypes.DATE,

      allowNull: true,
    },

    ends_at: {
      type: DataTypes.DATE,

      allowNull: true,
    },

    deleted_at: {
      type: DataTypes.DATE,

      allowNull: true,
    },
  },
  {
    tableName: "home_banners",

    timestamps: true,

    createdAt: "created_at",

    updatedAt: "updated_at",

    paranoid: true,

    deletedAt: "deleted_at",

    underscored: true,
  },
);

module.exports = HomeBanner;
