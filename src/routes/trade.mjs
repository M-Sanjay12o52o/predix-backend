import express from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/protected.mjs';

const router = express.Router();
const prisma = new PrismaClient();

// Get user's trades
router.get('/my-trades', requireAuth, async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;

    const where = { userId: req.user.userId };
    if (status) where.status = status;

    const [trades, total] = await Promise.all([
      prisma.trade.findMany({
        where,
        include: {
          market: {
            select: {
              id: true,
              title: true,
              category: true
            }
          },
          outcome: {
            select: {
              id: true,
              title: true
            }
          }
        },
        skip: (page - 1) * limit,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.trade.count({ where })
    ]);

    res.json({
      trades,
      total,
      pages: Math.ceil(total / limit),
      currentPage: parseInt(page)
    });
  } catch (error) {
    console.error('Error fetching trades:', error);
    res.status(500).json({ message: 'Error fetching trades' });
  }
});

// Create new trade
router.post('/', requireAuth, async (req, res) => {
  try {
    const { marketId, outcomeId, amount, price, type } = req.body;

    // Validate market exists and is open
    const market = await prisma.market.findUnique({
      where: { id: marketId },
      include: { outcomes: true }
    });

    if (!market) {
      return res.status(404).json({ message: 'Market not found' });
    }

    if (market.status !== 'OPEN') {
      return res.status(400).json({ message: 'Market is not open for trading' });
    }

    // Validate outcome exists
    const outcome = market.outcomes.find(o => o.id === outcomeId);
    if (!outcome) {
      return res.status(404).json({ message: 'Outcome not found' });
    }

    // Create trade
    const trade = await prisma.trade.create({
      data: {
        amount: parseFloat(amount),
        price: parseFloat(price),
        type,
        userId: req.user.userId,
        marketId,
        outcomeId
      },
      include: {
        market: {
          select: {
            id: true,
            title: true,
            category: true
          }
        },
        outcome: {
          select: {
            id: true,
            title: true
          }
        }
      }
    });

    res.status(201).json(trade);
  } catch (error) {
    console.error('Error creating trade:', error);
    res.status(500).json({ message: 'Error creating trade' });
  }
});

// Cancel trade
router.patch('/:id/cancel', requireAuth, async (req, res) => {
  try {
    const trade = await prisma.trade.findUnique({
      where: { id: req.params.id }
    });

    if (!trade) {
      return res.status(404).json({ message: 'Trade not found' });
    }

    if (trade.userId !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized to cancel this trade' });
    }

    if (trade.status !== 'PENDING') {
      return res.status(400).json({ message: 'Can only cancel pending trades' });
    }

    const updatedTrade = await prisma.trade.update({
      where: { id: req.params.id },
      data: { status: 'CANCELLED' }
    });

    res.json(updatedTrade);
  } catch (error) {
    console.error('Error cancelling trade:', error);
    res.status(500).json({ message: 'Error cancelling trade' });
  }
});

export default router; 