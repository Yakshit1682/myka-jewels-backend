const { DataTypes } = require("sequelize");

const sequelize = require("../config/database");

const HomeBannerImage = sequelize.define(
  "HomeBannerImage",
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

    banner_id: {
      type: DataTypes.BIGINT.UNSIGNED,

      allowNull: false,
    },

    image_data_uri: {
      type: DataTypes.TEXT("medium"),

      allowNull: false,
    },

    alt_text: {
      type: DataTypes.STRING(255),

      allowNull: true,
    },

    sort_order: {
      type: DataTypes.TINYINT.UNSIGNED,

      allowNull: false,

      defaultValue: 1,

      validate: {
        min: 1,
        max: 5,
      },
    },

    link_url: {
      type: DataTypes.STRING(500),

      allowNull: true,
    },

    deleted_at: {
      type: DataTypes.DATE,

      allowNull: true,
    },
  },
  {
    tableName: "home_banner_images",

    timestamps: true,

    createdAt: "created_at",

    updatedAt: "updated_at",

    paranoid: true,

    deletedAt: "deleted_at",

    underscored: true,
  },
);

module.exports = HomeBannerImage;
