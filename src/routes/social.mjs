import express from 'express';
import {
  toggleLikeMarket,
  toggleLikeComment,
  toggleFollowUser,
  toggleFollowMarket,
  getMarketLikeCount,
  getCommentLikeCount,
  hasUserLikedMarket,
  hasUserLikedComment,
  getUserFollowerCount,
  getUserFollowingCount,
  getMarketFollowerCount,
  isUserFollowingUser,
  isUserFollowingMarket,
} from '../services/social.mjs';
import { protect } from '../middleware/auth.mjs'; // Assuming you have an auth middleware

const router = express.Router();

// Protect all social routes
router.use(protect);

// Toggle like for a market
router.post('/likes/market/:marketId', async (req, res) => {
  try {
    const userId = req.user.id; // Assuming user ID is available on req.user
    const { marketId } = req.params;
    const result = await toggleLikeMarket(userId, marketId);
    res.json(result);
  } catch (error) {
    console.error('Error toggling market like:', error);
    res.status(500).json({ error: 'Failed to toggle market like' });
  }
});

// Toggle like for a comment
router.post('/likes/comment/:commentId', async (req, res) => {
  try {
    const userId = req.user.id;
    const { commentId } = req.params;
    const result = await toggleLikeComment(userId, commentId);
    res.json(result);
  } catch (error) {
    console.error('Error toggling comment like:', error);
    res.status(500).json({ error: 'Failed to toggle comment like' });
  }
});

// Toggle follow for a user
router.post('/follow/user/:followingId', async (req, res) => {
  try {
    const followerId = req.user.id;
    const { followingId } = req.params;
    const result = await toggleFollowUser(followerId, followingId);
    res.json(result);
  } catch (error) {
    console.error('Error toggling user follow:', error);
    res.status(500).json({ error: 'Failed to toggle user follow' });
  }
});

// Toggle follow for a market
router.post('/follow/market/:followingMarketId', async (req, res) => {
  try {
    const followerId = req.user.id;
    const { followingMarketId } = req.params;
    const result = await toggleFollowMarket(followerId, followingMarketId);
    res.json(result);
  } catch (error) {
    console.error('Error toggling market follow:', error);
    res.status(500).json({ error: 'Failed to toggle market follow' });
  }
});

// Get like count for a market
router.get('/likes/market/:marketId/count', async (req, res) => {
  try {
    const { marketId } = req.params;
    const count = await getMarketLikeCount(marketId);
    res.json({ count });
  } catch (error) {
    console.error('Error getting market like count:', error);
    res.status(500).json({ error: 'Failed to get market like count' });
  }
});

// Get like count for a comment
router.get('/likes/comment/:commentId/count', async (req, res) => {
  try {
    const { commentId } = req.params;
    const count = await getCommentLikeCount(commentId);
    res.json({ count });
  } catch (error) {
    console.error('Error getting comment like count:', error);
    res.status(500).json({ error: 'Failed to get comment like count' });
  }
});

// Check if user has liked a market
router.get('/users/:userId/likes/market/:marketId', async (req, res) => {
  try {
    const { userId, marketId } = req.params;
    // Ensure authenticated user is the same as the userId in the params, or add admin check
    if (req.user.id !== userId) {
        return res.status(403).json({ error: 'Unauthorized' });
    }
    const hasLiked = await hasUserLikedMarket(userId, marketId);
    res.json({ hasLiked });
  } catch (error) {
    console.error('Error checking if user liked market:', error);
    res.status(500).json({ error: 'Failed to check if user liked market' });
  }
});

// Check if user has liked a comment
router.get('/users/:userId/likes/comment/:commentId', async (req, res) => {
  try {
    const { userId, commentId } = req.params;
     // Ensure authenticated user is the same as the userId in the params, or add admin check
     if (req.user.id !== userId) {
        return res.status(403).json({ error: 'Unauthorized' });
    }
    const hasLiked = await hasUserLikedComment(userId, commentId);
    res.json({ hasLiked });
  } catch (error) {
    console.error('Error checking if user liked comment:', error);
    res.status(500).json({ error: 'Failed to check if user liked comment' });
  }
});

// Get follower count for a user
router.get('/users/:userId/followers/count', async (req, res) => {
  try {
    const { userId } = req.params;
    const count = await getUserFollowerCount(userId);
    res.json({ count });
  } catch (error) {
    console.error('Error getting user follower count:', error);
    res.status(500).json({ error: 'Failed to get user follower count' });
  }
});

// Get following count for a user
router.get('/users/:userId/following/count', async (req, res) => {
  try {
    const { userId } = req.params;
     // Ensure authenticated user is the same as the userId in the params, or add admin check
     if (req.user.id !== userId) {
        return res.status(403).json({ error: 'Unauthorized' });
    }
    const count = await getUserFollowingCount(userId);
    res.json({ count });
  } catch (error) {
    console.error('Error getting user following count:', error);
    res.status(500).json({ error: 'Failed to get user following count' });
  }
});

// Get follower count for a market
router.get('/markets/:marketId/followers/count', async (req, res) => {
  try {
    const { marketId } = req.params;
    const count = await getMarketFollowerCount(marketId);
    res.json({ count });
  } catch (error) {
    console.error('Error getting market follower count:', error);
    res.status(500).json({ error: 'Failed to get market follower count' });
  }
});

// Check if user is following another user
router.get('/users/:followerId/following/user/:followingId', async (req, res) => {
  try {
    const { followerId, followingId } = req.params;
     // Ensure authenticated user is the same as the followerId in the params, or add admin check
     if (req.user.id !== followerId) {
        return res.status(403).json({ error: 'Unauthorized' });
    }
    const isFollowing = await isUserFollowingUser(followerId, followingId);
    res.json({ isFollowing });
  } catch (error) {
    console.error('Error checking if user is following user:', error);
    res.status(500).json({ error: 'Failed to check if user is following user' });
  }
});

// Check if user is following a market
router.get('/users/:followerId/following/market/:followingMarketId', async (req, res) => {
  try {
    const { followerId, followingMarketId } = req.params;
     // Ensure authenticated user is the same as the followerId in the params, or add admin check
     if (req.user.id !== followerId) {
        return res.status(403).json({ error: 'Unauthorized' });
    }
    const isFollowing = await isUserFollowingMarket(followerId, followingMarketId);
    res.json({ isFollowing });
  } catch (error) {
    console.error('Error checking if user is following market:', error);
    res.status(500).json({ error: 'Failed to check if user is following market' });
  }
});

export default router; 