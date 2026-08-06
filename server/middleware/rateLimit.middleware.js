const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Tul sok bejelentkezesi probalkozas. Kerlek probald kesobb.' },
});

module.exports = { loginLimiter };
