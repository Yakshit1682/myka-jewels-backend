const Collection = require("../models/Collection");
const generateSlug = require("../utils/generateSlug");

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
        "created_at",
        "updated_at",
      ],

      order: [
        ["sort_order", "ASC"],
        ["name", "ASC"],
      ],
    });

    return res.status(200).json({
      success: true,
      message: "Collections fetched successfully",
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

const getCollectionByUuid = async (req, res) => {
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
    const {
      name,
      description = null,
      image_data_uri = null,
      sort_order = 0,
      is_active = true,
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Collection name is required",
      });
    }

    const cleanName = name.trim();

    const slug = generateSlug(cleanName);

    const existingCollection = await Collection.findOne({
      where: {
        slug,
      },

      paranoid: false,
    });

    if (existingCollection) {
      /*
       * If it was previously soft deleted,
       * do not silently create another record
       * with the same slug.
       */

      if (existingCollection.deleted_at) {
        return res.status(409).json({
          success: false,
          message:
            "A deleted collection with this name already exists. Restore it or use another name.",
        });
      }

      return res.status(409).json({
        success: false,
        message: "Collection already exists",
      });
    }

    const collection = await Collection.create({
      name: cleanName,
      slug,
      description,
      image_data_uri,
      sort_order: Number(sort_order) || 0,
      is_active: Boolean(is_active),
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
     * If name changes, regenerate slug.
     */
    if (name !== undefined) {
      if (!name.trim()) {
        return res.status(400).json({
          success: false,
          message: "Collection name cannot be empty",
        });
      }

      const cleanName = name.trim();

      const newSlug = generateSlug(cleanName);

      if (newSlug !== collection.slug) {
        const existingCollection = await Collection.findOne({
          where: {
            slug: newSlug,
          },

          paranoid: false,
        });

        if (existingCollection && existingCollection.uuid !== collection.uuid) {
          return res.status(409).json({
            success: false,
            message: "Another collection with this name already exists",
          });
        }
      }

      collection.name = cleanName;
      collection.slug = newSlug;
    }

    if (description !== undefined) {
      collection.description = description || null;
    }

    if (image_data_uri !== undefined) {
      collection.image_data_uri = image_data_uri || null;
    }

    if (sort_order !== undefined) {
      collection.sort_order = Number(sort_order) || 0;
    }

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
     * Because paranoid:true is enabled,
     * this performs a soft delete.
     */
    await collection.destroy();

    return res.status(200).json({
      success: true,
      message: "Collection deleted successfully",
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
  getCollectionByUuid,
  createCollection,
  updateCollection,
  deleteCollection,
};
