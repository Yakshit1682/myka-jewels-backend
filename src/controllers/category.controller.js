const { Category } = require("../models/index");
const createSlug = require("../utils/slug");

const getCategories = async (req, res) => {
  console.log("Fetching categories...", await Category);
  try {
    const categories = await Category.findAll({
      where: {
        parent_id: null,
        is_active: true,
      },

      attributes: ["uuid", "name", "slug", "description", "sort_order"],

      include: [
        {
          model: Category,
          as: "children",

          where: {
            is_active: true,
          },

          required: false,

          attributes: ["uuid", "name", "slug", "description", "sort_order"],
        },
      ],

      order: [
        ["sort_order", "ASC"],
        ["name", "ASC"],
        [{ model: Category, as: "children" }, "sort_order", "ASC"],
      ],
    });

    return res.status(200).json({
      success: true,
      data: categories,
    });
  } catch (error) {
    console.error("Get categories error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch categories",
    });
  }
};

const getCategoryBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const category = await Category.findOne({
      where: {
        slug,
        is_active: true,
      },

      include: [
        {
          model: Category,
          as: "children",

          where: {
            is_active: true,
          },

          required: false,
        },

        {
          model: Category,
          as: "parent",
          required: false,
        },
      ],
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: category,
    });
  } catch (error) {
    console.error("Get category error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch category",
    });
  }
};

const createCategory = async (req, res) => {
  try {
    const { name, parent_uuid, description, sort_order } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Category name is required",
      });
    }

    let parent = null;

    if (parent_uuid) {
      parent = await Category.findOne({
        where: {
          uuid: parent_uuid,
        },
      });

      if (!parent) {
        return res.status(400).json({
          success: false,
          message: "Parent category not found",
        });
      }
    }

    let slug = createSlug(name);

    const existingSlug = await Category.findOne({
      where: {
        slug,
      },
    });

    if (existingSlug) {
      slug = `${slug}-${Date.now()}`;
    }

    const category = await Category.create({
      name: name.trim(),
      slug,
      parent_id: parent?.id || null,
      description: description?.trim() || null,
      sort_order: Number(sort_order || 0),
    });

    return res.status(201).json({
      success: true,
      message: "Category created successfully",
      data: category,
    });
  } catch (error) {
    console.error("Create category error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to create category",
    });
  }
};

const updateCategory = async (req, res) => {
  try {
    const { uuid } = req.params;

    const { name, parent_uuid, description, sort_order, is_active } = req.body;

    const category = await Category.findOne({
      where: {
        uuid,
      },
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    if (name !== undefined) {
      if (!name.trim()) {
        return res.status(400).json({
          success: false,
          message: "Category name cannot be empty",
        });
      }

      category.name = name.trim();

      const newSlug = createSlug(name);

      const duplicateSlug = await Category.findOne({
        where: {
          slug: newSlug,
        },
      });

      if (duplicateSlug && duplicateSlug.id !== category.id) {
        category.slug = `${newSlug}-${Date.now()}`;
      } else {
        category.slug = newSlug;
      }
    }

    if (parent_uuid !== undefined) {
      if (parent_uuid === null) {
        category.parent_id = null;
      } else {
        const parent = await Category.findOne({
          where: {
            uuid: parent_uuid,
          },
        });

        if (!parent) {
          return res.status(400).json({
            success: false,
            message: "Parent category not found",
          });
        }

        if (parent.id === category.id) {
          return res.status(400).json({
            success: false,
            message: "Category cannot be its own parent",
          });
        }

        category.parent_id = parent.id;
      }
    }

    if (description !== undefined) {
      category.description = description?.trim() || null;
    }

    if (sort_order !== undefined) {
      category.sort_order = Number(sort_order);
    }

    if (is_active !== undefined) {
      category.is_active = Boolean(is_active);
    }

    await category.save();

    return res.status(200).json({
      success: true,
      message: "Category updated successfully",
      data: category,
    });
  } catch (error) {
    console.error("Update category error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update category",
    });
  }
};

const deleteCategory = async (req, res) => {
  try {
    const { uuid } = req.params;

    const category = await Category.findOne({
      where: {
        uuid,
      },
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    /*
     * Soft disable instead of physically deleting.
     */
    category.is_active = false;

    await category.save();

    return res.status(200).json({
      success: true,
      message: "Category disabled successfully",
    });
  } catch (error) {
    console.error("Delete category error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to delete category",
    });
  }
};

module.exports = {
  getCategories,
  getCategoryBySlug,
  createCategory,
  updateCategory,
  deleteCategory,
};
