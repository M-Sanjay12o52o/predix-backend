import express from 'express';
import { resolveMarket, getMarketResolution } from '../services/resolution.mjs';
import { authenticateToken } from '../middleware/auth.mjs';

const router = express.Router();

// Resolve a market
router.post('/:marketId', authenticateToken, async (req, res) => {
  try {
    const { resolvedOutcomeId } = req.body;
    const { marketId } = req.params;

    if (!resolvedOutcomeId) {
      return res.status(400).json({ error: 'Resolved outcome ID is required' });
    }

    const resolution = await resolveMarket(marketId, resolvedOutcomeId, req.user.id);
    res.json(resolution);
  } catch (error) {
    console.error('Error resolving market:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get market resolution
router.get('/:marketId', async (req, res) => {
  try {
    const resolution = await getMarketResolution(req.params.marketId);
    if (!resolution) {
      return res.status(404).json({ error: 'Market resolution not found' });
    }
    res.json(resolution);
  } catch (error) {
    console.error('Error getting market resolution:', error);
    res.status(500).json({ error: 'Failed to get market resolution' });
  }
});

export default router; 