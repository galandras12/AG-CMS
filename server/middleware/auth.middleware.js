const { verify } = require('../core/jwt');

const COOKIE_NAME = 'agcms_session';

function requireAuth(req, res, next) {
  const token = req.signedCookies?.[COOKIE_NAME];
  if (!token) {
    return res.status(401).json({ error: 'Nincs bejelentkezve.' });
  }
  try {
    req.user = verify(token);
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Ervenytelen vagy lejart session.' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Nincs jogosultsagod ehhez a muvelethez.' });
    }
    return next();
  };
}

module.exports = { requireAuth, requireRole, COOKIE_NAME };
