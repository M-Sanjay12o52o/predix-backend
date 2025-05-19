import { prisma } from '../lib/prisma.js';

// Like/Unlike Market
export const toggleLikeMarket = async (userId, marketId) => {
  try {
    const existingLike = await prisma.like.findUnique({
      where: {
        userId_marketId_commentId: {
          userId,
          marketId,
          commentId: null, // Ensure it's a market like
        },
      },
    });

    if (existingLike) {
      // Unlike
      await prisma.like.delete({
        where: { id: existingLike.id },
      });
      return { liked: false, likeCount: await prisma.like.count({ where: { marketId } }) };
    } else {
      // Like
      const newLike = await prisma.like.create({
        data: {
          userId,
          marketId,
        },
      });
      return { liked: true, likeCount: await prisma.like.count({ where: { marketId } }) };
    }
  } catch (error) {
    console.error('Error toggling market like:', error);
    throw new Error('Failed to toggle market like');
  }
};

// Like/Unlike Comment
export const toggleLikeComment = async (userId, commentId) => {
  try {
    const existingLike = await prisma.like.findUnique({
      where: {
        userId_marketId_commentId: {
          userId,
          marketId: null, // Ensure it's a comment like
          commentId,
        },
      },
    });

    if (existingLike) {
      // Unlike
      await prisma.like.delete({
        where: { id: existingLike.id },
      });
      return { liked: false, likeCount: await prisma.like.count({ where: { commentId } }) };
    } else {
      // Like
      const newLike = await prisma.like.create({
        data: {
          userId,
          commentId,
        },
      });
      return { liked: true, likeCount: await prisma.like.count({ where: { commentId } }) };
    }
  } catch (error) {
    console.error('Error toggling comment like:', error);
    throw new Error('Failed to toggle comment like');
  }
};

// Follow/Unfollow User
export const toggleFollowUser = async (followerId, followingId) => {
  try {
    const existingFollow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId,
        },
      },
    });

    if (existingFollow) {
      // Unfollow
      await prisma.follow.delete({
        where: { id: existingFollow.id },
      });
      return { following: false, followerCount: await prisma.follow.count({ where: { followingId } }) };
    } else {
      // Follow
      const newFollow = await prisma.follow.create({
        data: {
          followerId,
          followingId,
        },
      });
      return { following: true, followerCount: await prisma.follow.count({ where: { followingId } }) };
    }
  } catch (error) {
    console.error('Error toggling user follow:', error);
    throw new Error('Failed to toggle user follow');
  }
};

// Follow/Unfollow Market
export const toggleFollowMarket = async (followerId, followingMarketId) => {
  try {
    const existingFollow = await prisma.follow.findUnique({
      where: {
        followerId_followingMarketId: {
          followerId,
          followingMarketId,
        },
      },
    });

    if (existingFollow) {
      // Unfollow
      await prisma.follow.delete({
        where: { id: existingFollow.id },
      });
      return { following: false, followerCount: await prisma.follow.count({ where: { followingMarketId } }) };
    } else {
      // Follow
      const newFollow = await prisma.follow.create({
        data: {
          followerId,
          followingMarketId,
        },
      });
      return { following: true, followerCount: await prisma.follow.count({ where: { followingMarketId } }) };
    }
  } catch (error) {
    console.error('Error toggling market follow:', error);
    throw new Error('Failed to toggle market follow');
  }
};

// Get like count for a market
export const getMarketLikeCount = async (marketId) => {
  try {
    const count = await prisma.like.count({ where: { marketId } });
    return count;
  } catch (error) {
    console.error('Error getting market like count:', error);
    throw new Error('Failed to get market like count');
  }
};

// Get like count for a comment
export const getCommentLikeCount = async (commentId) => {
  try {
    const count = await prisma.like.count({ where: { commentId } });
    return count;
  } catch (error) {
    console.error('Error getting comment like count:', error);
    throw new Error('Failed to get comment like count');
  }
};

// Check if user likes a market
export const hasUserLikedMarket = async (userId, marketId) => {
  try {
    const like = await prisma.like.findUnique({
      where: {
        userId_marketId_commentId: {
          userId,
          marketId,
          commentId: null,
        },
      },
    });
    return !!like;
  } catch (error) {
    console.error('Error checking if user liked market:', error);
    throw new Error('Failed to check if user liked market');
  }
};

// Check if user likes a comment
export const hasUserLikedComment = async (userId, commentId) => {
  try {
    const like = await prisma.like.findUnique({
      where: {
        userId_marketId_commentId: {
          userId,
          marketId: null,
          commentId,
        },
      },
    });
    return !!like;
  } catch (error) {
    console.error('Error checking if user liked comment:', error);
    throw new Error('Failed to check if user liked comment');
  }
};

// Get follower count for a user
export const getUserFollowerCount = async (userId) => {
  try {
    const count = await prisma.follow.count({ where: { followingId: userId } });
    return count;
  } catch (error) {
    console.error('Error getting user follower count:', error);
    throw new Error('Failed to get user follower count');
  }
};

// Get following count for a user
export const getUserFollowingCount = async (userId) => {
  try {
    const count = await prisma.follow.count({ where: { followerId: userId } });
    return count;
  } catch (error) {
    console.error('Error getting user following count:', error);
    throw new Error('Failed to get user following count');
  }
};

// Get follower count for a market
export const getMarketFollowerCount = async (marketId) => {
  try {
    const count = await prisma.follow.count({ where: { followingMarketId: marketId } });
    return count;
  } catch (error) {
    console.error('Error getting market follower count:', error);
    throw new Error('Failed to get market follower count');
  }
};

// Check if user is following another user
export const isUserFollowingUser = async (followerId, followingId) => {
  try {
    const follow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId,
        },
      },
    });
    return !!follow;
  } catch (error) {
    console.error('Error checking if user is following user:', error);
    throw new Error('Failed to check if user is following user');
  }
};

// Check if user is following a market
export const isUserFollowingMarket = async (followerId, followingMarketId) => {
  try {
    const follow = await prisma.follow.findUnique({
      where: {
        followerId_followingMarketId: {
          followerId,
          followingMarketId,
        },
      },
    });
    return !!follow;
  } catch (error) {
    console.error('Error checking if user is following market:', error);
    throw new Error('Failed to check if user is following market');
  }
}; 