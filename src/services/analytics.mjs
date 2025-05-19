import { prisma } from '../lib/prisma.js';

export const calculatePriceMovement = async (marketId) => {
  const trades = await prisma.trade.findMany({
    where: { marketId },
    orderBy: { createdAt: 'asc' },
    include: { outcome: true }
  });

  const priceHistory = trades.reduce((acc, trade) => {
    const timestamp = trade.createdAt;
    const price = trade.outcome.probability;
    acc.push({ timestamp, price });
    return acc;
  }, []);

  return priceHistory;
};

export const analyzeVolume = async (marketId) => {
  const trades = await prisma.trade.findMany({
    where: { marketId },
    orderBy: { createdAt: 'asc' }
  });

  const volumeByTime = trades.reduce((acc, trade) => {
    const timestamp = trade.createdAt;
    const volume = trade.amount;
    acc.push({ timestamp, volume });
    return acc;
  }, []);

  const totalVolume = volumeByTime.reduce((sum, { volume }) => sum + volume, 0);
  const averageVolume = totalVolume / volumeByTime.length;
  const peakVolume = Math.max(...volumeByTime.map(({ volume }) => volume));

  return {
    volumeByTime,
    totalVolume,
    averageVolume,
    peakVolume
  };
};

export const detectTrends = async (marketId) => {
  const priceHistory = await calculatePriceMovement(marketId);
  const volumeData = await analyzeVolume(marketId);

  // Calculate price momentum
  const priceChanges = priceHistory.slice(1).map((point, i) => ({
    timestamp: point.timestamp,
    change: point.price - priceHistory[i].price
  }));

  // Calculate volume momentum
  const volumeChanges = volumeData.volumeByTime.slice(1).map((point, i) => ({
    timestamp: point.timestamp,
    change: point.volume - volumeData.volumeByTime[i].volume
  }));

  // Detect trends
  const trends = {
    price: {
      direction: priceChanges[priceChanges.length - 1]?.change > 0 ? 'up' : 'down',
      momentum: priceChanges.reduce((sum, { change }) => sum + change, 0) / priceChanges.length,
      volatility: Math.sqrt(priceChanges.reduce((sum, { change }) => sum + change * change, 0) / priceChanges.length)
    },
    volume: {
      direction: volumeChanges[volumeChanges.length - 1]?.change > 0 ? 'up' : 'down',
      momentum: volumeChanges.reduce((sum, { change }) => sum + change, 0) / volumeChanges.length,
      volatility: Math.sqrt(volumeChanges.reduce((sum, { change }) => sum + change * change, 0) / volumeChanges.length)
    }
  };

  return trends;
};

export const analyzeCorrelations = async (marketId) => {
  // Get all markets in the same category
  const market = await prisma.market.findUnique({
    where: { id: marketId },
    include: { category: true }
  });

  const relatedMarkets = await prisma.market.findMany({
    where: { categoryId: market.categoryId },
    include: {
      trades: {
        include: { outcome: true }
      }
    }
  });

  // Calculate price correlations
  const correlations = relatedMarkets.map(relatedMarket => {
    const marketPrices = market.trades.map(trade => trade.outcome.probability);
    const relatedPrices = relatedMarket.trades.map(trade => trade.outcome.probability);

    // Calculate correlation coefficient
    const correlation = calculateCorrelation(marketPrices, relatedPrices);

    return {
      marketId: relatedMarket.id,
      title: relatedMarket.title,
      correlation
    };
  });

  return correlations;
};

const calculateCorrelation = (x, y) => {
  const n = Math.min(x.length, y.length);
  if (n === 0) return 0;

  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((a, b, i) => a + b * y[i], 0);
  const sumX2 = x.reduce((a, b) => a + b * b, 0);
  const sumY2 = y.reduce((a, b) => a + b * b, 0);

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

  return denominator === 0 ? 0 : numerator / denominator;
};

export const getMarketAnalytics = async (marketId) => {
  const [priceMovement, volumeAnalysis, trends, correlations] = await Promise.all([
    calculatePriceMovement(marketId),
    analyzeVolume(marketId),
    detectTrends(marketId),
    analyzeCorrelations(marketId)
  ]);

  return {
    priceMovement,
    volumeAnalysis,
    trends,
    correlations
  };
}; 