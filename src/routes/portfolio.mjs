import express from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/protected.mjs';

const router = express.Router();
const prisma = new PrismaClient();

// Get user portfolio overview
router.get('/overview', requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get all completed trades
    const trades = await prisma.trade.findMany({
      where: {
        userId,
        status: 'COMPLETED'
      },
      include: {
        market: {
          select: {
            id: true,
            title: true,
            status: true
          }
        },
        outcome: {
          select: {
            id: true,
            title: true,
            isResolved: true,
            probability: true
          }
        }
      }
    });

    // Calculate portfolio metrics
    const metrics = {
      totalTrades: trades.length,
      activePositions: 0,
      totalVolume: 0,
      realizedPnL: 0,
      unrealizedPnL: 0
    };

    // Process trades to calculate metrics
    trades.forEach(trade => {
      metrics.totalVolume += trade.amount;

      if (trade.market.status === 'RESOLVED') {
        // Calculate realized P&L for resolved markets
        if (trade.type === 'BUY' && trade.outcome.isResolved && trade.outcome.probability === 1.0) {
          metrics.realizedPnL += trade.amount * (1 - trade.price);
        } else if (trade.type === 'BUY') {
          metrics.realizedPnL -= trade.amount * trade.price;
        }
      } else {
        // Count active positions and calculate unrealized P&L
        metrics.activePositions++;
        if (trade.type === 'BUY') {
          metrics.unrealizedPnL += trade.amount * (trade.outcome.probability - trade.price);
        }
      }
    });

    res.json(metrics);
  } catch (error) {
    console.error('Error fetching portfolio overview:', error);
    res.status(500).json({ message: 'Error fetching portfolio overview' });
  }
});

// Get user's active positions
router.get('/positions', requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;

    const positions = await prisma.trade.findMany({
      where: {
        userId,
        status: 'COMPLETED',
        market: {
          status: 'OPEN'
        }
      },
      include: {
        market: {
          select: {
            id: true,
            title: true,
            category: true,
            expiryDate: true
          }
        },
        outcome: {
          select: {
            id: true,
            title: true,
            probability: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Group positions by market
    const groupedPositions = positions.reduce((acc, trade) => {
      const marketId = trade.marketId;
      if (!acc[marketId]) {
        acc[marketId] = {
          market: trade.market,
          positions: []
        };
      }
      acc[marketId].positions.push({
        outcome: trade.outcome,
        amount: trade.amount,
        price: trade.price,
        type: trade.type,
        unrealizedPnL: trade.type === 'BUY' 
          ? trade.amount * (trade.outcome.probability - trade.price)
          : trade.amount * (trade.price - trade.outcome.probability)
      });
      return acc;
    }, {});

    res.json(Object.values(groupedPositions));
  } catch (error) {
    console.error('Error fetching positions:', error);
    res.status(500).json({ message: 'Error fetching positions' });
  }
});

// Get user's trading history with performance
router.get('/history', requireAuth, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const userId = req.user.userId;

    const [trades, total] = await Promise.all([
      prisma.trade.findMany({
        where: {
          userId,
          status: 'COMPLETED'
        },
        include: {
          market: {
            select: {
              id: true,
              title: true,
              status: true,
              category: true
            }
          },
          outcome: {
            select: {
              id: true,
              title: true,
              isResolved: true,
              probability: true
            }
          }
        },
        skip: (page - 1) * limit,
        take: parseInt(limit),
        orderBy: {
          createdAt: 'desc'
        }
      }),
      prisma.trade.count({
        where: {
          userId,
          status: 'COMPLETED'
        }
      })
    ]);

    // Calculate performance metrics for each trade
    const tradesWithPerformance = trades.map(trade => {
      let pnl = 0;
      if (trade.market.status === 'RESOLVED') {
        if (trade.type === 'BUY' && trade.outcome.isResolved && trade.outcome.probability === 1.0) {
          pnl = trade.amount * (1 - trade.price);
        } else if (trade.type === 'BUY') {
          pnl = -trade.amount * trade.price;
        }
      } else {
        pnl = trade.type === 'BUY'
          ? trade.amount * (trade.outcome.probability - trade.price)
          : trade.amount * (trade.price - trade.outcome.probability);
      }

      return {
        ...trade,
        performance: {
          pnl,
          roi: (pnl / (trade.amount * trade.price)) * 100
        }
      };
    });

    res.json({
      trades: tradesWithPerformance,
      total,
      pages: Math.ceil(total / limit),
      currentPage: parseInt(page)
    });
  } catch (error) {
    console.error('Error fetching trading history:', error);
    res.status(500).json({ message: 'Error fetching trading history' });
  }
});

export default router; 