import { prisma } from '../lib/prisma.js';

const TRUST_SCORE_WEIGHTS = {
  accuracy: 0.4,
  totalPredictions: 0.2,
  successfulPredictions: 0.4
};

const BADGE_THRESHOLDS = {
  NOVICE: { predictions: 10, accuracy: 0.5 },
  INTERMEDIATE: { predictions: 50, accuracy: 0.6 },
  EXPERT: { predictions: 100, accuracy: 0.7 },
  MASTER: { predictions: 200, accuracy: 0.8 }
};

export const calculateReputation = async (userId) => {
  // Get user's resolved trades
  const trades = await prisma.trade.findMany({
    where: {
      userId,
      status: 'RESOLVED'
    },
    include: {
      market: {
        include: {
          resolution: true
        }
      }
    }
  });

  // Calculate accuracy and successful predictions
  const totalPredictions = trades.length;
  const successfulPredictions = trades.filter(trade => {
    const resolution = trade.market.resolution;
    return resolution && trade.outcomeId === resolution.resolvedOutcomeId;
  }).length;

  const accuracy = totalPredictions > 0 ? successfulPredictions / totalPredictions : 0;

  // Calculate trust score
  const trustScore = calculateTrustScore({
    accuracy,
    totalPredictions,
    successfulPredictions
  });

  // Determine badges
  const badges = determineBadges({
    totalPredictions,
    accuracy
  });

  // Update or create reputation
  const reputation = await prisma.userReputation.upsert({
    where: { userId },
    update: {
      accuracy,
      totalPredictions,
      successfulPredictions,
      trustScore,
      badges
    },
    create: {
      userId,
      accuracy,
      totalPredictions,
      successfulPredictions,
      trustScore,
      badges
    }
  });

  return reputation;
};

const calculateTrustScore = ({ accuracy, totalPredictions, successfulPredictions }) => {
  const normalizedPredictions = Math.min(totalPredictions / 100, 1);
  const normalizedSuccess = Math.min(successfulPredictions / 50, 1);

  return (
    accuracy * TRUST_SCORE_WEIGHTS.accuracy +
    normalizedPredictions * TRUST_SCORE_WEIGHTS.totalPredictions +
    normalizedSuccess * TRUST_SCORE_WEIGHTS.successfulPredictions
  );
};

const determineBadges = ({ totalPredictions, accuracy }) => {
  const badges = [];

  if (totalPredictions >= BADGE_THRESHOLDS.MASTER.predictions && 
      accuracy >= BADGE_THRESHOLDS.MASTER.accuracy) {
    badges.push('MASTER');
  } else if (totalPredictions >= BADGE_THRESHOLDS.EXPERT.predictions && 
             accuracy >= BADGE_THRESHOLDS.EXPERT.accuracy) {
    badges.push('EXPERT');
  } else if (totalPredictions >= BADGE_THRESHOLDS.INTERMEDIATE.predictions && 
             accuracy >= BADGE_THRESHOLDS.INTERMEDIATE.accuracy) {
    badges.push('INTERMEDIATE');
  } else if (totalPredictions >= BADGE_THRESHOLDS.NOVICE.predictions && 
             accuracy >= BADGE_THRESHOLDS.NOVICE.accuracy) {
    badges.push('NOVICE');
  }

  return badges;
};

export const getUserReputation = async (userId) => {
  const reputation = await prisma.userReputation.findUnique({
    where: { userId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    }
  });

  if (!reputation) {
    return calculateReputation(userId);
  }

  return reputation;
};

export const getTopPredictors = async (limit = 10) => {
  return prisma.userReputation.findMany({
    orderBy: [
      { trustScore: 'desc' },
      { totalPredictions: 'desc' }
    ],
    take: limit,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    }
  });
}; 