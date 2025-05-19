import { prisma } from '../lib/prisma.js';

export const searchMarkets = async (searchTerm, categoryId, status, orderBy, limit = 10, offset = 0) => {
  try {
    const where = {
      // Basic search on title and description
      ...(searchTerm && {
        OR: [
          { title: { contains: searchTerm, mode: 'insensitive' } },
          { description: { contains: searchTerm, mode: 'insensitive' } },
        ],
      }),
      // Filter by category
      ...(categoryId && { categoryId }),
      // Filter by status
      ...(status && { status }),
    };

    const orderByClause = {};
    if (orderBy) {
      // Example orderBy: 'createdAt_desc', 'title_asc'
      const [field, order] = orderBy.split('_');
      if (field && (order === 'asc' || order === 'desc')) {
        orderByClause[field] = order;
      }
    }

    const markets = await prisma.market.findMany({
      where,
      include: {
        category: true,
        outcomes: true,
      },
      orderBy: orderBy ? orderByClause : { createdAt: 'desc' }, // Default sort
      take: limit,
      skip: offset,
    });

    const totalCount = await prisma.market.count({ where });

    return {
      markets,
      totalCount,
    };
  } catch (error) {
    console.error('Error searching markets:', error);
    throw new Error('Failed to search markets');
  }
};

export const getMarketCategories = async () => {
  try {
    const categories = await prisma.category.findMany();
    return categories;
  } catch (error) {
    console.error('Error getting market categories:', error);
    throw new Error('Failed to get market categories');
  }
};

// You can add more functions here for trending, popular, etc. 