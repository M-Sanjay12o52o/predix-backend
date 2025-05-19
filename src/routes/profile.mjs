import express from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/protected.mjs';

const router = express.Router();
const prisma = new PrismaClient();

// Get user profile
router.get('/', requireAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        email: true,
        name: true,
        bio: true,
        location: true,
        website: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ message: 'Error fetching profile' });
  }
});

// Update user profile
router.put('/', requireAuth, async (req, res) => {
  try {
    const { name, bio, location, website } = req.body;

    const updatedUser = await prisma.user.update({
      where: { id: req.user.userId },
      data: {
        name,
        bio,
        location,
        website
      },
      select: {
        id: true,
        email: true,
        name: true,
        bio: true,
        location: true,
        website: true,
        updatedAt: true
      }
    });

    res.json(updatedUser);
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ message: 'Error updating profile' });
  }
});

export default router; 