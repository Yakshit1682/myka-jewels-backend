const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const ProductInquiry = sequelize.define(
  "ProductInquiry",
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

    user_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
    },

    product_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
    },

    customer_name: {
      type: DataTypes.STRING(150),
      allowNull: true,
    },

    customer_email: {
      type: DataTypes.STRING(191),
      allowNull: true,
    },

    customer_phone: {
      type: DataTypes.STRING(30),
      allowNull: true,
    },

    inquiry_message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },

    whatsapp_number: {
      type: DataTypes.STRING(30),
      allowNull: false,
    },

    status: {
      type: DataTypes.ENUM("CLICKED", "CONTACTED", "CLOSED"),
      allowNull: false,
      defaultValue: "CLICKED",
    },

    admin_notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    clicked_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "product_inquiries",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
);

module.exports = ProductInquiry;
