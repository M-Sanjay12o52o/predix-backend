import express from 'express';
import { searchMarkets, getMarketCategories } from '../services/marketDiscovery.mjs';

const router = express.Router();

// Search markets
router.get('/markets', async (req, res) => {
  try {
    const { searchTerm, categoryId, status, orderBy, limit, offset } = req.query;
    const result = await searchMarkets(
      searchTerm,
      categoryId,
      status,
      orderBy,
      parseInt(limit) || 10,
      parseInt(offset) || 0
    );
    res.json(result);
  } catch (error) {
    console.error('Error searching markets:', error);
    res.status(500).json({ error: 'Failed to search markets' });
  }
});

// Get all market categories
router.get('/categories', async (req, res) => {
  try {
    const categories = await getMarketCategories();
    res.json(categories);
  } catch (error) {
    console.error('Error getting categories:', error);
    res.status(500).json({ error: 'Failed to get categories' });
  }
});

export default router; 