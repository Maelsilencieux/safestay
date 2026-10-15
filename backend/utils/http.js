// backend/utils/http.js
const serverError = (res, error) => {
  console.error(error);
  return res.status(500).json({
    success: false,
    message: 'Erreur interne du serveur',
    error: error.message
  });
};

module.exports = { serverError };