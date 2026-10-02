class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }
const httpError = (status, message) => new HttpError(status, message);
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
module.exports = { HttpError, httpError, wrap };
