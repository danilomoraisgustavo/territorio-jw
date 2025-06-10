// src/utils/validators.js
function isEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

function isStrongPassword(password) {
  // mínimo 8 caracteres, ao menos uma letra e um número
  const re = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;
  return re.test(password);
}

module.exports = {
  isEmail,
  isStrongPassword,
};
