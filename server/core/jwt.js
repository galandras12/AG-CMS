const jwt = require('jsonwebtoken');
const config = require('../config');

const EXPIRES_IN = '8h';
const EXPIRES_IN_MS = 8 * 60 * 60 * 1000;

function sign(user) {
  return jwt.sign(
    { sub: user.id, username: user.username, role: user.role, displayName: user.displayName },
    config.jwtSecret,
    { expiresIn: EXPIRES_IN }
  );
}

function verify(token) {
  return jwt.verify(token, config.jwtSecret);
}

module.exports = { sign, verify, EXPIRES_IN, EXPIRES_IN_MS };
