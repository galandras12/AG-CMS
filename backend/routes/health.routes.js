const express = require('express');
const config = require('../config');

const router = express.Router();

router.get('/', (req, res) => {
  const { version, versionName } = config.versionInfo;
  res.json({
    status: 'ok',
    name: 'AG-CMS',
    version,
    versionName,
    display: `${version} (${versionName})`,
    time: new Date().toISOString(),
  });
});

module.exports = router;
