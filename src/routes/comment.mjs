import express from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/protected.mjs';
import { wsManager } from '../websocket/index.mjs';

const router = express.Router();
const prisma = new PrismaClient();

// Get comments for a market
router.get('/market/:marketId', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const marketId = req.params.marketId;

    const [comments, total] = await Promise.all([
      prisma.comment.findMany({
        where: { marketId },
        include: {
          user: {
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
      prisma.comment.count({ where: { marketId } })
    ]);

    res.json({
      comments,
      total,
      pages: Math.ceil(total / limit),
      currentPage: parseInt(page)
    });
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ message: 'Error fetching comments' });
  }
});

// Create a comment
router.post('/market/:marketId', requireAuth, async (req, res) => {
  try {
    const marketId = req.params.marketId;
    const { content } = req.body;
    const userId = req.user.userId;

    // Verify market exists
    const market = await prisma.market.findUnique({
      where: { id: marketId }
    });

    if (!market) {
      return res.status(404).json({ message: 'Market not found' });
    }

    // Create comment
    const comment = await prisma.comment.create({
      data: {
        content,
        userId,
        marketId
      },
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

    // Broadcast new comment to market subscribers
    wsManager.broadcastMarketUpdate(marketId, {
      type: 'NEW_COMMENT',
      comment
    });

    res.status(201).json(comment);
  } catch (error) {
    console.error('Error creating comment:', error);
    res.status(500).json({ message: 'Error creating comment' });
  }
});

// Update a comment
router.patch('/:id', requireAuth, async (req, res) => {
  try {
    const { content } = req.body;
    const commentId = req.params.id;
    const userId = req.user.userId;

    // Verify comment exists and belongs to user
    const comment = await prisma.comment.findUnique({
      where: { id: commentId }
    });

    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    if (comment.userId !== userId) {
      return res.status(403).json({ message: 'Not authorized to update this comment' });
    }

    // Update comment
    const updatedComment = await prisma.comment.update({
      where: { id: commentId },
      data: { content },
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

    // Broadcast comment update to market subscribers
    wsManager.broadcastMarketUpdate(comment.marketId, {
      type: 'COMMENT_UPDATED',
      comment: updatedComment
    });

    res.json(updatedComment);
  } catch (error) {
    console.error('Error updating comment:', error);
    res.status(500).json({ message: 'Error updating comment' });
  }
});

// Delete a comment
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const commentId = req.params.id;
    const userId = req.user.userId;

    // Verify comment exists and belongs to user
    const comment = await prisma.comment.findUnique({
      where: { id: commentId }
    });

    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    if (comment.userId !== userId) {
      return res.status(403).json({ message: 'Not authorized to delete this comment' });
    }

    // Delete comment
    await prisma.comment.delete({
      where: { id: commentId }
    });

    // Broadcast comment deletion to market subscribers
    wsManager.broadcastMarketUpdate(comment.marketId, {
      type: 'COMMENT_DELETED',
      commentId
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ message: 'Error deleting comment' });
  }
});

export default router; 