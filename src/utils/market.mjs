import { prisma } from '../lib/prisma.js';

export const calculatePayouts = async (marketId, resolvedOutcomeId) => {
  // Get all trades for the market
  const trades = await prisma.trade.findMany({
    where: {
      marketId,
      status: 'ACTIVE'
    },
    include: {
      outcome: true,
      user: true
    }
  });

  // Group trades by user and outcome
  const userPositions = trades.reduce((acc, trade) => {
    const key = `${trade.userId}-${trade.outcomeId}`;
    if (!acc[key]) {
      acc[key] = {
        userId: trade.userId,
        outcomeId: trade.outcomeId,
        amount: 0,
        totalCost: 0
      };
    }
    acc[key].amount += trade.amount;
    acc[key].totalCost += trade.amount * trade.price;
    return acc;
  }, {});

  // Calculate payouts
  const payouts = Object.values(userPositions).map(position => {
    const isWinning = position.outcomeId === resolvedOutcomeId;
    const payout = isWinning ? position.amount : 0;
    const profit = payout - position.totalCost;

    return {
      userId: position.userId,
      outcomeId: position.outcomeId,
      amount: position.amount,
      totalCost: position.totalCost,
      payout,
      profit
    };
  });

  // Update user balances and trade statuses
  for (const payout of payouts) {
    // Update user balance
    await prisma.user.update({
      where: { id: payout.userId },
      data: {
        balance: {
          increment: payout.payout
        }
      }
    });

    // Update trade statuses
    await prisma.trade.updateMany({
      where: {
        marketId,
        userId: payout.userId,
        outcomeId: payout.outcomeId,
        status: 'ACTIVE'
      },
      data: {
        status: 'RESOLVED'
      }
    });
  }

  return payouts;
}; 