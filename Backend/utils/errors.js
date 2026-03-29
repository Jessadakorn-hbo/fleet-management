const createErrorBody = (code, message, extra = {}) => ({
  error: {
    code,
    message,
    ...extra,
  },
});

const sendAuthError = (res, status, code, message, extra = {}) =>
  res.status(status).json(createErrorBody(code, message, extra));

module.exports = {
  createErrorBody,
  sendAuthError,
};
