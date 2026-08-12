// src/controllers/contact.controller.js

const { ContactFormSubmission } = require("../models");

const submitContactForm = async (req, res) => {
  try {
    const { first_name, last_name, email, phone, subject, message } = req.body;

    const normalizedEmail = email?.trim().toLowerCase();

    if (!first_name?.trim() || !normalizedEmail || !message?.trim()) {
      return res.status(400).json({
        success: false,
        message: "First name, email and message are required",
      });
    }

    const submission = await ContactFormSubmission.create({
      first_name: first_name.trim(),

      last_name: last_name?.trim() || null,

      email: normalizedEmail,

      phone: phone?.trim() || null,

      subject: subject?.trim() || null,

      message: message.trim(),

      status: "NEW",
    });

    return res.status(201).json({
      success: true,
      message: "Your message has been submitted successfully",

      data: {
        uuid: submission.uuid,
      },
    });
  } catch (error) {
    console.error("Contact form error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to submit contact form",
    });
  }
};

module.exports = {
  submitContactForm,
};
