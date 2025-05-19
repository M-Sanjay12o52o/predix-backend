import { verifyToken } from './auth.mjs';

export const requireAuth = (req, res, next) => {
  verifyToken(req, res, next);
};

export const requireAdmin = (req, res, next) => {
  verifyToken(req, res, () => {
    if (req.user && req.user.role === 'ADMIN') {
      next();
    } else {
      res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }
  });
}; 