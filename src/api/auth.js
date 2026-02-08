const express = require('express');
const router = express.Router();
const authService = require('../auth/service');

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, full_name, institution } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const result = await authService.register({ username, email, password, full_name, institution });
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const result = await authService.login({ email, password });
    res.json(result);
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});

// GET /api/auth/me
router.get('/me', authService.authMiddleware, async (req, res) => {
  try {
    res.json({ user: req.user.toSafeJSON() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
