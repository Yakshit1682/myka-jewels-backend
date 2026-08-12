const isValidImageDataUri = (value) => {
  if (typeof value !== "string") {
    return false;
  }

  return /^data:image\/(png|jpeg|jpg|webp);base64,/i.test(value);
};

module.exports = {
  isValidImageDataUri,
};
