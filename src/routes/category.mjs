import express from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/protected.mjs';

const router = express.Router();
const prisma = new PrismaClient();

// Get all categories with statistics
router.get('/', async (req, res) => {
  try {
    const categories = await prisma.market.groupBy({
      by: ['category'],
      _count: {
        id: true
      },
      _sum: {
        // Add any other aggregations you want
      }
    });

    // Get active markets count for each category
    const activeMarkets = await prisma.market.groupBy({
      by: ['category'],
      where: {
        status: 'OPEN'
      },
      _count: {
        id: true
      }
    });

    // Combine the data
    const categoryStats = categories.map(cat => ({
      name: cat.category,
      totalMarkets: cat._count.id,
      activeMarkets: activeMarkets.find(m => m.category === cat.category)?._count.id || 0
    }));

    res.json(categoryStats);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ message: 'Error fetching categories' });
  }
});

// Get category details with markets
router.get('/:name', async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const category = req.params.name;

    const where = { category };
    if (status) where.status = status;

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

    // Get category statistics
    const stats = await prisma.market.groupBy({
      by: ['status'],
      where: { category },
      _count: {
        id: true
      }
    });

    res.json({
      category,
      markets,
      total,
      pages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      stats: stats.reduce((acc, stat) => {
        acc[stat.status] = stat._count.id;
        return acc;
      }, {})
    });
  } catch (error) {
    console.error('Error fetching category details:', error);
    res.status(500).json({ message: 'Error fetching category details' });
  }
});

// Get category analytics
router.get('/:name/analytics', async (req, res) => {
  try {
    const category = req.params.name;

    // Get trading volume by date
    const volumeByDate = await prisma.trade.groupBy({
      by: ['createdAt'],
      where: {
        market: {
          category
        },
        status: 'COMPLETED'
      },
      _sum: {
        amount: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    // Get outcome distribution
    const outcomeDistribution = await prisma.outcome.groupBy({
      by: ['isResolved'],
      where: {
        market: {
          category
        }
      },
      _count: {
        id: true
      }
    });

    // Get average market duration
    const marketDurations = await prisma.market.findMany({
      where: {
        category,
        status: 'RESOLVED'
      },
      select: {
        createdAt: true,
        updatedAt: true
      }
    });

    const avgDuration = marketDurations.reduce((sum, market) => {
      return sum + (market.updatedAt - market.createdAt);
    }, 0) / (marketDurations.length || 1);

    res.json({
      category,
      volumeByDate: volumeByDate.map(v => ({
        date: v.createdAt,
        volume: v._sum.amount
      })),
      outcomeDistribution: outcomeDistribution.reduce((acc, dist) => {
        acc[dist.isResolved ? 'resolved' : 'unresolved'] = dist._count.id;
        return acc;
      }, {}),
      averageMarketDuration: avgDuration
    });
  } catch (error) {
    console.error('Error fetching category analytics:', error);
    res.status(500).json({ message: 'Error fetching category analytics' });
  }
});

export default router; 