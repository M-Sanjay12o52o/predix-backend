import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

export async function createTestUser(email = 'test@test.com') {
  const hashedPassword = await bcrypt.hash('testpassword', 10);
  
  return await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name: 'Test User',
      emailVerified: true
    }
  });
}

export async function getAuthToken(email, password) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error('User not found');

  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) throw new Error('Invalid password');

  return jwt.sign(
    { userId: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
} 