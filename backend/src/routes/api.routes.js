const express = require('express');
const router = express.Router();
const { translateSignLanguage } = require('../controllers/gemini.controller');

module.exports = function(activeUsers) {
  router.post('/translate', translateSignLanguage);

  router.get('/health', (req, res) => {
    res.json({ status: 'ok', active_users: activeUsers.size, timestamp: new Date() });
  });

  router.get('/stats', (req, res) => {
    const stats = Array.from(activeUsers.entries()).map(([id, data]) => ({ id, ...data }));
    res.json(stats);
  });

  return router;
};
