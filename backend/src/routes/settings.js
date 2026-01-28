const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

const prisma = new PrismaClient();

// Get all settings
router.get('/', authMiddleware, async (req, res) => {
  try {
    const settings = await prisma.setting.findMany();
    const settingsObj = {};
    settings.forEach(s => {
      try {
        settingsObj[s.key] = JSON.parse(s.value);
      } catch {
        settingsObj[s.key] = s.value;
      }
    });
    res.json(settingsObj);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Update settings
router.put('/', authMiddleware, roleMiddleware('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const updates = req.body;

    for (const [key, value] of Object.entries(updates)) {
      const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
      await prisma.setting.upsert({
        where: { key },
        create: { key, value: stringValue },
        update: { value: stringValue }
      });
    }

    res.json({ message: 'Settings updated' });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// Get company settings
router.get('/company', authMiddleware, async (req, res) => {
  try {
    const setting = await prisma.setting.findUnique({ where: { key: 'company' } });
    res.json(setting ? JSON.parse(setting.value) : {});
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch company settings' });
  }
});

// Update company settings
router.put('/company', authMiddleware, roleMiddleware('ADMIN'), async (req, res) => {
  try {
    await prisma.setting.upsert({
      where: { key: 'company' },
      create: { key: 'company', value: JSON.stringify(req.body) },
      update: { value: JSON.stringify(req.body) }
    });
    res.json({ message: 'Company settings updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update company settings' });
  }
});

module.exports = router;
