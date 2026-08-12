const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Product = sequelize.define(
  "Product",
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

    name: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },

    slug: {
      type: DataTypes.STRING(220),
      allowNull: false,
      unique: true,
    },

    sku: {
      type: DataTypes.STRING(100),
      allowNull: true,
      unique: true,
    },

    short_description: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },

    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    material: {
      type: DataTypes.STRING(150),
      allowNull: true,
    },

    metal_color: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    price: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
    },

    compare_at_price: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
    },

    weight_grams: {
      type: DataTypes.DECIMAL(10, 3),
      allowNull: true,
    },

    stock_status: {
      type: DataTypes.ENUM("IN_STOCK", "OUT_OF_STOCK", "ON_REQUEST"),
      allowNull: false,
      defaultValue: "IN_STOCK",
    },

    is_featured: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },

    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },

    created_by: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
    },

    updated_by: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
    },
  },
  {
    tableName: "products",

    timestamps: true,

    createdAt: "created_at",
    updatedAt: "updated_at",

    paranoid: true,
    deletedAt: "deleted_at",
  },
);

module.exports = Product;
