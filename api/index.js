// Vercel serverless entry point
// This file re-exports the Express app as a serverless function
const app = require('../src/server');

module.exports = app;
