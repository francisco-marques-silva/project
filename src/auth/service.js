const jwt = require('jsonwebtoken');
const config = require('../core/config');

// Lazy-load User model to avoid circular dependency
let User;
function getUser() {
  if (!User) User = require('../models').User;
  return User;
}

function generateToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, email: user.email },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
}

function verifyToken(token) {
  return jwt.verify(token, config.jwt.secret);
}

async function authMiddleware(req, res, next) {
  try {
    // Check Authorization header first, then query param (for downloads)
    let token = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.query.token) {
      token = req.query.token;
    }

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = verifyToken(token);
    const UserModel = getUser();
    const user = await UserModel.findByPk(decoded.id);
    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'Invalid or inactive user' });
    }

    req.user = user;
    req.userId = user.id;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
}

async function register({ username, email, password, full_name, institution }) {
  const UserModel = getUser();

  const existingUser = await UserModel.findOne({ where: { email } });
  if (existingUser) throw new Error('Email already registered');

  const existingUsername = await UserModel.findOne({ where: { username } });
  if (existingUsername) throw new Error('Username already taken');

  const user = await UserModel.create({
    username,
    email,
    password_hash: password,
    full_name,
    institution
  });

  const token = generateToken(user);
  return { user: user.toSafeJSON(), token };
}

async function login({ email, password }) {
  const UserModel = getUser();
  const user = await UserModel.findOne({ where: { email } });
  if (!user) throw new Error('Invalid email or password');

  const valid = await user.validatePassword(password);
  if (!valid) throw new Error('Invalid email or password');

  const token = generateToken(user);
  return { user: user.toSafeJSON(), token };
}

module.exports = {
  generateToken,
  verifyToken,
  authMiddleware,
  register,
  login
};
