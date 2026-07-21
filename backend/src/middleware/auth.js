const { createHash } = require('node:crypto');
const jwt = require('jsonwebtoken');

function jwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) throw new Error('JWT_SECRET must contain at least 32 characters');
  return secret;
}

function sessionTokenHash(sessionId) {
  return createHash('sha256').update(sessionId).digest('hex');
}

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'Authentication required' });
    const token = authHeader.slice(7).trim();
    const decoded = jwt.verify(token, jwtSecret(), { algorithms: ['HS256'], issuer: 'pest-control-evidence' });
    if (!decoded.sub || !decoded.jti || !Number.isInteger(decoded.authVersion)) return res.status(401).json({ error: 'Invalid session' });
    const [user, session] = await Promise.all([
      req.prisma.user.findUnique({
        where: { id: decoded.sub },
        select: { id: true, email: true, firstName: true, lastName: true, role: true, isActive: true, authVersion: true },
      }),
      req.prisma.session.findUnique({ where: { token: sessionTokenHash(decoded.jti) } }),
    ]);
    if (!user?.isActive || user.authVersion !== decoded.authVersion || !session || session.userId !== user.id || session.expiresAt <= new Date()) {
      return res.status(401).json({ error: 'Session revoked or expired' });
    }
    req.user = user;
    req.sessionId = decoded.jti;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') return res.status(401).json({ error: 'Session expired' });
    return res.status(401).json({ error: 'Invalid session' });
  }
};

const roleMiddleware = (...allowedRoles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });
  if (!allowedRoles.includes(req.user.role)) return res.status(403).json({ error: 'Insufficient permissions' });
  next();
};

module.exports = { authMiddleware, jwtSecret, roleMiddleware, sessionTokenHash };
