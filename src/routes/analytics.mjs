import express from 'express';
import { getMarketAnalytics } from '../services/analytics.mjs';

const router = express.Router();

// Get market analytics
router.get('/markets/:marketId', async (req, res) => {
  try {
    const analytics = await getMarketAnalytics(req.params.marketId);
    res.json(analytics);
  } catch (error) {
    console.error('Error getting market analytics:', error);
    res.status(500).json({ error: 'Failed to get market analytics' });
  }
});

// Get trending markets
router.get('/markets/trending', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const trendingMarkets = await getTrendingMarkets(limit);
    res.json(trendingMarkets);
  } catch (error) {
    console.error('Error getting trending markets:', error);
    res.status(500).json({ error: 'Failed to get trending markets' });
  }
});

// Get market correlations
router.get('/markets/:marketId/correlations', async (req, res) => {
  try {
    const correlations = await analyzeCorrelations(req.params.marketId);
    res.json(correlations);
  } catch (error) {
    console.error('Error getting market correlations:', error);
    res.status(500).json({ error: 'Failed to get market correlations' });
  }
});

export default router; 