import { prisma } from "../lib/prisma.js";
import { calculatePayouts } from "../utils/market.mjs";

export const createResolution = async ({
  marketId,
  resolvedOutcomeId,
  evidence,
  resolvedBy,
}) => {
  // Validate market exists and is active
  const market = await prisma.market.findUnique({
    where: { id: marketId },
    include: { outcomes: true },
  });

  if (!market) {
    throw new Error("Market not found");
  }

  if (market.status !== "ACTIVE") {
    throw new Error("Market is not active");
  }

  // Validate outcome exists in market
  const outcome = market.outcomes.find((o) => o.id === resolvedOutcomeId);
  if (!outcome) {
    throw new Error("Invalid outcome for this market");
  }

  // Create resolution
  const resolution = await prisma.marketResolution.create({
    data: {
      marketId,
      resolvedOutcomeId,
      evidence,
      resolvedBy,
      status: "PENDING",
    },
  });

  return resolution;
};

export const updateResolution = async (id, { status, evidence }) => {
  const resolution = await prisma.marketResolution.findUnique({
    where: { id },
    include: { market: true },
  });

  if (!resolution) {
    throw new Error("Resolution not found");
  }

  // Update resolution
  const updatedResolution = await prisma.marketResolution.update({
    where: { id },
    data: {
      status,
      evidence: evidence || resolution.evidence,
      resolvedAt: status === "APPROVED" ? new Date() : null,
    },
  });

  // If resolution is approved, update market status and calculate payouts
  if (status === "APPROVED") {
    await prisma.market.update({
      where: { id: resolution.marketId },
      data: { status: "RESOLVED" },
    });

    // Calculate and distribute payouts
    await calculatePayouts(resolution.marketId, resolution.resolvedOutcomeId);
  }

  return updatedResolution;
};

export const submitDispute = async (resolutionId, { reason, evidence }) => {
  const resolution = await prisma.marketResolution.findUnique({
    where: { id: resolutionId },
  });

  if (!resolution) {
    throw new Error("Resolution not found");
  }

  if (resolution.status !== "PENDING") {
    throw new Error("Resolution cannot be disputed");
  }

  // Update resolution status to disputed
  const updatedResolution = await prisma.marketResolution.update({
    where: { id: resolutionId },
    data: {
      status: "DISPUTED",
      evidence: `${resolution.evidence}\n\nDispute: ${reason}\nEvidence: ${evidence}`,
    },
  });

  return updatedResolution;
};

export const getResolution = async (marketId) => {
  const resolution = await prisma.marketResolution.findUnique({
    where: { marketId },
    include: {
      resolvedOutcome: true,
      resolver: {
        select: {
          id: true,
          username: true,
        },
      },
    },
  });

  return resolution;
};

export const resolveMarket = async (marketId, resolvedOutcomeId, userId) => {
  // Get market with trades and outcomes
  const market = await prisma.market.findUnique({
    where: { id: marketId },
    include: {
      trades: {
        include: {
          outcome: true,
        },
      },
      outcomes: true,
      creator: true,
    },
  });

  if (!market) {
    throw new Error("Market not found");
  }

  if (market.creatorId !== userId) {
    throw new Error("Only market creator can resolve the market");
  }

  if (market.status !== "ACTIVE") {
    throw new Error("Market is not active");
  }

  // Calculate total volume and winning outcome volume
  const totalVolume = market.trades.reduce(
    (sum, trade) => sum + trade.amount,
    0,
  );
  const winningVolume = market.trades
    .filter((trade) => trade.outcomeId === resolvedOutcomeId)
    .reduce((sum, trade) => sum + trade.amount, 0);

  // Calculate reward multiplier
  const rewardMultiplier = totalVolume / winningVolume;

  // Create resolution record
  const resolution = await prisma.marketResolution.create({
    data: {
      marketId,
      resolvedOutcomeId,
      totalVolume,
      winningVolume,
      rewardMultiplier,
    },
  });

  // Update market status
  await prisma.market.update({
    where: { id: marketId },
    data: { status: "RESOLVED" },
  });

  // Update trades and distribute rewards
  const tradeUpdates = market.trades.map(async (trade) => {
    const isWinner = trade.outcomeId === resolvedOutcomeId;
    const reward = isWinner ? trade.amount * rewardMultiplier : 0;

    return prisma.trade.update({
      where: { id: trade.id },
      data: {
        status: "RESOLVED",
        reward,
      },
    });
  });

  await Promise.all(tradeUpdates);

  // Update user reputations
  const userTrades = await prisma.trade.findMany({
    where: { marketId },
    include: { user: true },
  });

  const userUpdates = userTrades.map(async (trade) => {
    const isWinner = trade.outcomeId === resolvedOutcomeId;
    const reputation = await prisma.userReputation.findUnique({
      where: { userId: trade.userId },
    });

    if (reputation) {
      return prisma.userReputation.update({
        where: { userId: trade.userId },
        data: {
          totalPredictions: reputation.totalPredictions + 1,
          successfulPredictions:
            reputation.successfulPredictions + (isWinner ? 1 : 0),
        },
      });
    }
  });

  await Promise.all(userUpdates);

  return resolution;
};

export const getMarketResolution = async (marketId) => {
  return prisma.marketResolution.findUnique({
    where: { marketId },
    include: {
      market: {
        include: {
          outcomes: true,
          trades: {
            include: {
              user: true,
              outcome: true,
            },
          },
        },
      },
    },
  });
};

