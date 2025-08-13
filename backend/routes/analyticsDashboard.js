// analyticsDashboard.js
const express = require('express');
const router = express.Router();
const AnalyticsDashboardService = require('../services/AnalyticsDashboardService');

// GET /api/analytics/stats
router.get('/stats', async (req, res) => {
  const result = await AnalyticsDashboardService.getSearchStats();
  res.json(result);
});

// GET /api/analytics/popular
router.get('/popular', async (req, res) => {
  const { limit } = req.query;
  const result = await AnalyticsDashboardService.getPopularSearches(Number(limit) || 10);
  res.json(result);
});

// GET /api/analytics/activity
router.get('/activity', async (req, res) => {
  const { days } = req.query;
  const result = await AnalyticsDashboardService.getSearchActivity(Number(days) || 30);
  res.json(result);
});

// GET /api/analytics/locations
router.get('/locations', async (req, res) => {
  const { limit } = req.query;
  const result = await AnalyticsDashboardService.getTopLocations(Number(limit) || 5);
  res.json(result);
});

module.exports = router;
