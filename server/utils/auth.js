const jwt = require('jsonwebtoken');

// Returns decoded token payload or null
function parseAuthHeader(req) {
  try {
    const authHeader = req.headers && req.headers.authorization;
    if (!authHeader) return null;
    const parts = authHeader.split(' ');
    if (parts.length !== 2) return null;
    const [scheme, token] = parts;
    if (!/^Bearer$/i.test(scheme)) return null;
    const ACCESS_SECRET = process.env.ACCESS_TOKEN_SECRET;
    if (!ACCESS_SECRET) return null;
    try {
      const decoded = jwt.verify(token, ACCESS_SECRET);
      return decoded;
    } catch (e) {
      return null;
    }
  } catch (e) {
    return null;
  }
}

module.exports = { parseAuthHeader };
