import express from 'express';
import { getUserReputation, getTopPredictors } from '../services/reputation.mjs';
import { authenticateToken } from '../middleware/auth.mjs';

const router = express.Router();

// Get user's reputation
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const reputation = await getUserReputation(req.user.id);
    res.json(reputation);
  } catch (error) {
    console.error('Error getting user reputation:', error);
    res.status(500).json({ error: 'Failed to get user reputation' });
  }
});

// Get specific user's reputation
router.get('/:userId', async (req, res) => {
  try {
    const reputation = await getUserReputation(req.params.userId);
    if (!reputation) {
      return res.status(404).json({ error: 'User reputation not found' });
    }
    res.json(reputation);
  } catch (error) {
    console.error('Error getting user reputation:', error);
    res.status(500).json({ error: 'Failed to get user reputation' });
  }
});

// Get top predictors
router.get('/top', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const topPredictors = await getTopPredictors(limit);
    res.json(topPredictors);
  } catch (error) {
    console.error('Error getting top predictors:', error);
    res.status(500).json({ error: 'Failed to get top predictors' });
  }
});

export default router; 