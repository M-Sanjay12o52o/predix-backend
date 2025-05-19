import express from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/protected.mjs';
import { authenticate } from '../middleware/auth.mjs';
import {
  createResolution,
  updateResolution,
  submitDispute,
  getResolution
} from '../services/resolution.mjs';

const router = express.Router();
const prisma = new PrismaClient();

// Get all markets with filtering and pagination
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      category, 
      status,
      search 
    } = req.query;

    const where = {};
    if (category) where.category = category;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [markets, total] = await Promise.all([
      prisma.market.findMany({
        where,
        include: {
          outcomes: true,
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        skip: (page - 1) * limit,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.market.count({ where })
    ]);

    res.json({
      markets,
      total,
      pages: Math.ceil(total / limit),
      currentPage: parseInt(page)
    });
  } catch (error) {
    console.error('Error fetching markets:', error);
    res.status(500).json({ message: 'Error fetching markets' });
  }
});

// Get single market
router.get('/:id', async (req, res) => {
  try {
    const market = await prisma.market.findUnique({
      where: { id: req.params.id },
      include: {
        outcomes: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    if (!market) {
      return res.status(404).json({ message: 'Market not found' });
    }

    res.json(market);
  } catch (error) {
    console.error('Error fetching market:', error);
    res.status(500).json({ message: 'Error fetching market' });
  }
});

// Create new market
router.post('/', requireAuth, async (req, res) => {
  try {
    const { title, description, category, expiryDate, outcomes } = req.body;

    const market = await prisma.market.create({
      data: {
        title,
        description,
        category,
        expiryDate: new Date(expiryDate),
        creatorId: req.user.userId,
        outcomes: {
          create: outcomes.map(outcome => ({
            title: outcome.title,
            description: outcome.description
          }))
        }
      },
      include: {
        outcomes: true
      }
    });

    res.status(201).json(market);
  } catch (error) {
    console.error('Error creating market:', error);
    res.status(500).json({ message: 'Error creating market' });
  }
});

// Update market status
router.patch('/:id/status', requireAuth, async (req, res) => {
  try {
    const { status } = req.body;
    const market = await prisma.market.findUnique({
      where: { id: req.params.id }
    });

    if (!market) {
      return res.status(404).json({ message: 'Market not found' });
    }

    // Only creator can update market status
    if (market.creatorId !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized to update this market' });
    }

    const updatedMarket = await prisma.market.update({
      where: { id: req.params.id },
      data: { status },
      include: {
        outcomes: true
      }
    });

    res.json(updatedMarket);
  } catch (error) {
    console.error('Error updating market status:', error);
    res.status(500).json({ message: 'Error updating market status' });
  }
});

// Resolve market
router.post('/:id/resolve', requireAuth, async (req, res) => {
  try {
    const { winningOutcomeId } = req.body;
    const market = await prisma.market.findUnique({
      where: { id: req.params.id },
      include: {
        outcomes: true,
        trades: {
          where: {
            status: 'COMPLETED'
          },
          include: {
            outcome: true
          }
        }
      }
    });

    if (!market) {
      return res.status(404).json({ message: 'Market not found' });
    }

    // Only creator can resolve market
    if (market.creatorId !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized to resolve this market' });
    }

    // Validate market can be resolved
    if (market.status !== 'OPEN') {
      return res.status(400).json({ message: 'Market is not open for resolution' });
    }

    // Validate winning outcome exists
    const winningOutcome = market.outcomes.find(o => o.id === winningOutcomeId);
    if (!winningOutcome) {
      return res.status(404).json({ message: 'Winning outcome not found' });
    }

    // Start a transaction to handle resolution
    const result = await prisma.$transaction(async (prisma) => {
      // Update market status
      const updatedMarket = await prisma.market.update({
        where: { id: req.params.id },
        data: { status: 'RESOLVED' },
        include: {
          outcomes: true
        }
      });

      // Update winning outcome
      await prisma.outcome.update({
        where: { id: winningOutcomeId },
        data: { 
          isResolved: true,
          probability: 1.0
        }
      });

      // Update losing outcomes
      await prisma.outcome.updateMany({
        where: {
          marketId: req.params.id,
          id: { not: winningOutcomeId }
        },
        data: {
          isResolved: true,
          probability: 0.0
        }
      });

      // Process payouts for winning trades
      const winningTrades = market.trades.filter(trade => 
        trade.outcomeId === winningOutcomeId && 
        trade.type === 'BUY'
      );

      // Update trade statuses
      await prisma.trade.updateMany({
        where: {
          id: { in: winningTrades.map(t => t.id) }
        },
        data: {
          status: 'RESOLVED'
        }
      });

      return updatedMarket;
    });

    res.json(result);
  } catch (error) {
    console.error('Error resolving market:', error);
    res.status(500).json({ message: 'Error resolving market' });
  }
});

// Get market resolution details
router.get('/:id/resolution', async (req, res) => {
  try {
    const market = await prisma.market.findUnique({
      where: { id: req.params.id },
      include: {
        outcomes: {
          include: {
            trades: {
              where: {
                status: 'COMPLETED'
              }
            }
          }
        }
      }
    });

    if (!market) {
      return res.status(404).json({ message: 'Market not found' });
    }

    // Calculate resolution statistics
    const resolutionDetails = {
      marketId: market.id,
      status: market.status,
      totalTrades: market.outcomes.reduce((sum, outcome) => sum + outcome.trades.length, 0),
      outcomes: market.outcomes.map(outcome => ({
        id: outcome.id,
        title: outcome.title,
        isResolved: outcome.isResolved,
        probability: outcome.probability,
        totalTrades: outcome.trades.length,
        totalVolume: outcome.trades.reduce((sum, trade) => sum + trade.amount, 0)
      }))
    };

    res.json(resolutionDetails);
  } catch (error) {
    console.error('Error fetching market resolution details:', error);
    res.status(500).json({ message: 'Error fetching market resolution details' });
  }
});

// Resolution routes
router.post('/:id/resolve', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { resolvedOutcomeId, evidence } = req.body;
    const resolvedBy = req.user.id;

    const resolution = await createResolution({
      marketId: id,
      resolvedOutcomeId,
      evidence,
      resolvedBy
    });

    res.json(resolution);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.get('/:id/resolution', async (req, res) => {
  try {
    const { id } = req.params;
    const resolution = await getResolution(id);
    
    if (!resolution) {
      return res.status(404).json({ message: 'Resolution not found' });
    }

    res.json(resolution);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.put('/:id/resolution', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, evidence } = req.body;

    // Only allow admins to update resolution status
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const resolution = await updateResolution(id, { status, evidence });
    res.json(resolution);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.post('/:id/resolution/dispute', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, evidence } = req.body;

    const resolution = await submitDispute(id, { reason, evidence });
    res.json(resolution);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

export default router; 