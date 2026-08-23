// src/models/ContactFormSubmission.js

const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const ContactFormSubmission = sequelize.define(
  "ContactFormSubmission",
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

    first_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },

    last_name: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    email: {
      type: DataTypes.STRING(191),
      allowNull: false,
    },

    phone: {
      type: DataTypes.STRING(30),
      allowNull: true,
    },

    subject: {
      type: DataTypes.STRING(150),
      allowNull: true,
    },

    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },

    status: {
      type: DataTypes.ENUM("NEW", "READ", "RESPONDED", "CLOSED"),
      allowNull: false,
      defaultValue: "NEW",
    },

    admin_notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: "contact_form_submissions",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    paranoid: true,
    deletedAt: "deleted_at",

    underscored: true,
  },
);

module.exports = ContactFormSubmission;
