const { Product, ProductInquiry, ProductImage } = require("../models");

const createInquiry = async (req, res) => {
  try {
    const { product_uuid } = req.params;

    const product = await Product.findOne({
      where: {
        uuid: product_uuid,
        is_active: true,
      },

      include: [
        {
          model: ProductImage,
          as: "images",
          required: false,
        },
      ],
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const whatsappNumber = process.env.SHOP_WHATSAPP_NUMBER;

    if (!whatsappNumber) {
      return res.status(500).json({
        success: false,
        message: "Shop WhatsApp number is not configured",
      });
    }

    const customerName = [req.user.first_name, req.user.last_name]
      .filter(Boolean)
      .join(" ");

    const message = [
      "Hello, I would like to inquire about this jewellery item.",
      "",
      `Product: ${product.name}`,
      product.sku ? `SKU: ${product.sku}` : null,
      product.price
        ? `Price: ₹${Number(product.price).toLocaleString("en-IN")}`
        : null,
      "",
      `Customer: ${customerName}`,
      req.user.phone ? `Phone: ${req.user.phone}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    const inquiry = await ProductInquiry.create({
      user_id: req.user.id,
      product_id: product.id,

      customer_name: customerName || null,
      customer_email: req.user.email || null,
      customer_phone: req.user.phone || null,

      inquiry_message: message,

      whatsapp_number: whatsappNumber,

      status: "CLICKED",

      clicked_at: new Date(),
    });

    const whatsappUrl =
      `https://wa.me/${whatsappNumber}` +
      `?text=${encodeURIComponent(message)}`;

    return res.status(201).json({
      success: true,
      message: "Inquiry recorded successfully",

      data: {
        inquiry_uuid: inquiry.uuid,
        whatsapp_url: whatsappUrl,
      },
    });
  } catch (error) {
    console.error("Create inquiry error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to create inquiry",
    });
  }
};

const getMyInquiries = async (req, res) => {
  try {
    const inquiries = await ProductInquiry.findAll({
      where: {
        user_id: req.user.id,
      },

      include: [
        {
          model: Product,
          as: "product",

          attributes: [
            "uuid",
            "name",
            "slug",
            "sku",
            "price",
            "material",
            "stock_status",
          ],

          include: [
            {
              model: ProductImage,
              as: "images",

              attributes: [
                "uuid",
                "data_uri",
                "alt_text",
                "sort_order",
                "is_primary",
              ],

              required: false,
            },
          ],
        },
      ],

      order: [
        ["clicked_at", "DESC"],

        [
          {
            model: Product,
            as: "product",
          },
          {
            model: ProductImage,
            as: "images",
          },
          "sort_order",
          "ASC",
        ],
      ],
    });

    return res.status(200).json({
      success: true,

      data: {
        total_inquiries: inquiries.length,
        inquiries,
      },
    });
  } catch (error) {
    console.error("Get inquiries error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch inquiries",
    });
  }
};

module.exports = {
  createInquiry,
  getMyInquiries,
};
