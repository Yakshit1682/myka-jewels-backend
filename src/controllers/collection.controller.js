const { Collection } = require("../models/index");

const createSlug = require("../utils/slug");

const getCollections = async (req, res) => {
  try {
    const collections = await Collection.findAll({
      where: {
        is_active: true,
      },

      attributes: [
        "uuid",
        "name",
        "slug",
        "description",
        "image_data_uri",
        "sort_order",
        "is_active",
      ],

      order: [
        ["sort_order", "ASC"],
        ["name", "ASC"],
      ],
    });

    return res.status(200).json({
      success: true,
      data: collections,
    });
  } catch (error) {
    console.error("Get collections error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch collections",
    });
  }
};

const getCollectionBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const collection = await Collection.findOne({
      where: {
        slug,
        is_active: true,
      },
    });

    if (!collection) {
      return res.status(404).json({
        success: false,
        message: "Collection not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: collection,
    });
  } catch (error) {
    console.error("Get collection error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch collection",
    });
  }
};

const createCollection = async (req, res) => {
  try {
    const { name, description, image_data_uri, sort_order, is_active } =
      req.body;

    if (!name?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Collection name is required",
      });
    }

    let slug = createSlug(name);

    const existingSlug = await Collection.findOne({
      where: {
        slug,
      },

      /*
       * Check even soft deleted rows
       * because slug is unique.
       */
      paranoid: false,
    });

    if (existingSlug) {
      slug = `${slug}-${Date.now()}`;
    }

    const collection = await Collection.create({
      name: name.trim(),

      slug,

      description: description?.trim() || null,

      image_data_uri: image_data_uri || null,

      sort_order: Number(sort_order || 0),

      is_active: is_active !== undefined ? Boolean(is_active) : true,
    });

    return res.status(201).json({
      success: true,
      message: "Collection created successfully",
      data: collection,
    });
  } catch (error) {
    console.error("Create collection error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to create collection",
    });
  }
};

const updateCollection = async (req, res) => {
  try {
    const { uuid } = req.params;

    const { name, description, image_data_uri, sort_order, is_active } =
      req.body;

    const collection = await Collection.findOne({
      where: {
        uuid,
      },
    });

    if (!collection) {
      return res.status(404).json({
        success: false,
        message: "Collection not found",
      });
    }

    /*
     * NAME + SLUG
     */
    if (name !== undefined) {
      if (!name.trim()) {
        return res.status(400).json({
          success: false,
          message: "Collection name cannot be empty",
        });
      }

      collection.name = name.trim();

      const newSlug = createSlug(name);

      const duplicateSlug = await Collection.findOne({
        where: {
          slug: newSlug,
        },

        paranoid: false,
      });

      if (duplicateSlug && duplicateSlug.id !== collection.id) {
        collection.slug = `${newSlug}-${Date.now()}`;
      } else {
        collection.slug = newSlug;
      }
    }

    /*
     * DESCRIPTION
     */
    if (description !== undefined) {
      collection.description = description?.trim() || null;
    }

    /*
     * IMAGE
     */
    if (image_data_uri !== undefined) {
      collection.image_data_uri = image_data_uri || null;
    }

    /*
     * SORT ORDER
     */
    if (sort_order !== undefined) {
      const parsedSortOrder = Number(sort_order);

      if (Number.isNaN(parsedSortOrder)) {
        return res.status(400).json({
          success: false,
          message: "Invalid sort order",
        });
      }

      collection.sort_order = parsedSortOrder;
    }

    /*
     * ACTIVE STATUS
     */
    if (is_active !== undefined) {
      collection.is_active = Boolean(is_active);
    }

    await collection.save();

    return res.status(200).json({
      success: true,
      message: "Collection updated successfully",
      data: collection,
    });
  } catch (error) {
    console.error("Update collection error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update collection",
    });
  }
};

const deleteCollection = async (req, res) => {
  try {
    const { uuid } = req.params;

    const collection = await Collection.findOne({
      where: {
        uuid,
      },
    });

    if (!collection) {
      return res.status(404).json({
        success: false,
        message: "Collection not found",
      });
    }

    /*
     * Same behaviour as Category:
     * disable it instead of physically deleting.
     */
    collection.is_active = false;

    await collection.save();

    return res.status(200).json({
      success: true,
      message: "Collection disabled successfully",
    });
  } catch (error) {
    console.error("Delete collection error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to delete collection",
    });
  }
};

module.exports = {
  getCollections,
  getCollectionBySlug,
  createCollection,
  updateCollection,
  deleteCollection,
};
