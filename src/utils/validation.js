const isValidEmail = (email) => {
  if (!email) return false;

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const isValidPhone = (phone) => {
  if (!phone) return true;

  return /^[0-9+\-\s]{7,20}$/.test(phone);
};

const normalizeEmail = (email) => {
  return email?.trim().toLowerCase();
};

module.exports = {
  isValidEmail,
  isValidPhone,
  normalizeEmail,
};
