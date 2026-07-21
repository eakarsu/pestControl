const { randomUUID } = require('node:crypto');
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { authMiddleware, jwtSecret, sessionTokenHash } = require('../middleware/auth');

const router = express.Router();

function safeUser(user) {
  return { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role };
}

router.post('/login', async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
    const user = await req.prisma.user.findUnique({ where: { email } });
    const valid = user ? await bcrypt.compare(password, user.password) : false;
    if (!valid || !user.isActive) return res.status(401).json({ error: 'Invalid credentials' });
    const sessionId = randomUUID();
    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000);
    await req.prisma.session.create({ data: { userId: user.id, token: sessionTokenHash(sessionId), expiresAt } });
    const token = jwt.sign(
      { authVersion: user.authVersion }, jwtSecret(),
      { algorithm: 'HS256', subject: user.id, jwtid: sessionId, issuer: 'pest-control-evidence', expiresIn: '8h' },
    );
    res.json({ user: safeUser(user), token, expiresAt });
  } catch (error) {
    console.error('Login failed', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

router.get('/me', authMiddleware, (req, res) => res.json(safeUser(req.user)));

router.put('/password', authMiddleware, async (req, res) => {
  try {
    const currentPassword = String(req.body.currentPassword || '');
    const newPassword = String(req.body.newPassword || '');
    if (newPassword.length < 14) return res.status(400).json({ error: 'New password must contain at least 14 characters' });
    const user = await req.prisma.user.findUnique({ where: { id: req.user.id } });
    if (!await bcrypt.compare(currentPassword, user.password)) return res.status(400).json({ error: 'Current password is incorrect' });
    const password = await bcrypt.hash(newPassword, 12);
    await req.prisma.$transaction([
      req.prisma.user.update({ where: { id: user.id }, data: { password, authVersion: { increment: 1 } } }),
      req.prisma.session.deleteMany({ where: { userId: user.id } }),
    ]);
    res.json({ message: 'Password updated; all sessions were revoked' });
  } catch (error) {
    console.error('Password update failed', error);
    res.status(500).json({ error: 'Password update failed' });
  }
});

router.post('/logout', authMiddleware, async (req, res) => {
  await req.prisma.session.deleteMany({ where: { token: sessionTokenHash(req.sessionId), userId: req.user.id } });
  res.status(204).end();
});

module.exports = router;
