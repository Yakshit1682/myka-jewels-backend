const User = require("./User");
const Role = require("./Role");
const UserRole = require("./UserRole");
const UserSession = require("./UserSession");
const PasswordResetToken = require("./PasswordResetToken");
const Category = require("./Category");
const Product = require("./Product");
const ProductImage = require("./ProductImage");
const ProductCategory = require("./ProductCategory");
const WishlistItem = require("./WishlistItem");
const ProductInquiry = require("./ProductInquiry");
const ContactFormSubmission = require("./ContactFormSubmission");

User.belongsToMany(Role, {
  through: UserRole,
  foreignKey: "user_id",
  otherKey: "role_id",
  as: "roles",
});

Role.belongsToMany(User, {
  through: UserRole,
  foreignKey: "role_id",
  otherKey: "user_id",
  as: "users",
});

User.hasMany(UserSession, {
  foreignKey: "user_id",
  as: "sessions",
});

UserSession.belongsTo(User, {
  foreignKey: "user_id",
  as: "user",
});

User.hasMany(PasswordResetToken, {
  foreignKey: "user_id",
  as: "password_reset_tokens",
});

PasswordResetToken.belongsTo(User, {
  foreignKey: "user_id",
  as: "user",
});

Category.hasMany(Category, {
  foreignKey: "parent_id",
  as: "children",
});

Category.belongsTo(Category, {
  foreignKey: "parent_id",
  as: "parent",
});

Product.hasMany(ProductImage, {
  foreignKey: "product_id",
  as: "images",
});

ProductImage.belongsTo(Product, {
  foreignKey: "product_id",
  as: "product",
});

Product.belongsToMany(Category, {
  through: ProductCategory,
  foreignKey: "product_id",
  otherKey: "category_id",
  as: "categories",
});

Category.belongsToMany(Product, {
  through: ProductCategory,
  foreignKey: "category_id",
  otherKey: "product_id",
  as: "products",
});

User.hasMany(WishlistItem, {
  foreignKey: "user_id",
  as: "wishlist_items",
});

WishlistItem.belongsTo(User, {
  foreignKey: "user_id",
  as: "user",
});

Product.hasMany(WishlistItem, {
  foreignKey: "product_id",
  as: "wishlist_items",
});

WishlistItem.belongsTo(Product, {
  foreignKey: "product_id",
  as: "product",
});

User.hasMany(ProductInquiry, {
  foreignKey: "user_id",
  as: "product_inquiries",
});

ProductInquiry.belongsTo(User, {
  foreignKey: "user_id",
  as: "user",
});

Product.hasMany(ProductInquiry, {
  foreignKey: "product_id",
  as: "inquiries",
});

ProductInquiry.belongsTo(Product, {
  foreignKey: "product_id",
  as: "product",
});

module.exports = {
  User,
  Role,
  UserRole,
  UserSession,
  Category,
  PasswordResetToken,
  Product,
  ProductImage,
  ProductCategory,
  WishlistItem,
  ProductInquiry,
  ContactFormSubmission,
};
