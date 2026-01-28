const express = require('express');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Get all products
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 50, search, category, lowStock } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { barcode: { contains: search, mode: 'insensitive' } }
      ];
    }
    if (category) where.category = category;
    if (lowStock === 'true') {
      where.inStock = { lte: req.prisma.product.fields.reorderLevel };
    }

    const [products, total] = await Promise.all([
      req.prisma.product.findMany({
        where,
        orderBy: { name: 'asc' },
        skip,
        take: parseInt(limit)
      }),
      req.prisma.product.count({ where })
    ]);

    res.json({
      products,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Get product by ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const product = await req.prisma.product.findUnique({
      where: { id: req.params.id },
      include: {
        _count: { select: { treatments: true, productUsages: true } }
      }
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// Get product by barcode
router.get('/barcode/:barcode', authMiddleware, async (req, res) => {
  try {
    const product = await req.prisma.product.findUnique({
      where: { barcode: req.params.barcode }
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    console.error('Get product by barcode error:', error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// Create product
router.post('/', authMiddleware, async (req, res) => {
  try {
    const product = await req.prisma.product.create({
      data: req.body
    });
    res.status(201).json(product);
  } catch (error) {
    console.error('Create product error:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'SKU or barcode already exists' });
    }
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// Update product
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const product = await req.prisma.product.update({
      where: { id: req.params.id },
      data: req.body
    });
    res.json(product);
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// Delete product
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    await req.prisma.product.delete({ where: { id: req.params.id } });
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// Adjust inventory
router.post('/:id/adjust-inventory', authMiddleware, async (req, res) => {
  try {
    const { adjustment, reason } = req.body;
    const product = await req.prisma.product.findUnique({
      where: { id: req.params.id }
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const newStock = product.inStock + adjustment;
    if (newStock < 0) {
      return res.status(400).json({ error: 'Cannot have negative inventory' });
    }

    const updated = await req.prisma.product.update({
      where: { id: req.params.id },
      data: { inStock: newStock }
    });

    res.json(updated);
  } catch (error) {
    console.error('Adjust inventory error:', error);
    res.status(500).json({ error: 'Failed to adjust inventory' });
  }
});

// Get low stock products
router.get('/status/low-stock', authMiddleware, async (req, res) => {
  try {
    const products = await req.prisma.product.findMany({
      where: {
        inStock: { lte: 10 } // Using a fixed value since Prisma doesn't support comparing columns directly in where
      },
      orderBy: { inStock: 'asc' }
    });

    // Filter to get products below reorder level
    const lowStockProducts = products.filter(p => p.inStock <= p.reorderLevel);

    res.json(lowStockProducts);
  } catch (error) {
    console.error('Get low stock products error:', error);
    res.status(500).json({ error: 'Failed to fetch low stock products' });
  }
});

// Get product categories for dropdown
router.get('/meta/categories', authMiddleware, async (req, res) => {
  try {
    const categories = await req.prisma.product.findMany({
      select: { category: true },
      distinct: ['category'],
      orderBy: { category: 'asc' }
    });
    res.json(categories.map(c => ({ value: c.category, label: c.category })));
  } catch (error) {
    const defaultCategories = [
      { value: 'Insecticide', label: 'Insecticide' },
      { value: 'Rodenticide', label: 'Rodenticide' },
      { value: 'Herbicide', label: 'Herbicide' },
      { value: 'Fungicide', label: 'Fungicide' },
      { value: 'Bait', label: 'Bait' },
      { value: 'Trap', label: 'Trap' },
      { value: 'Equipment', label: 'Equipment' },
      { value: 'Safety', label: 'Safety Equipment' }
    ];
    res.json(defaultCategories);
  }
});

// Get units of measure for dropdown
router.get('/meta/units', authMiddleware, async (req, res) => {
  const units = [
    { value: 'oz', label: 'Ounces (oz)' },
    { value: 'lb', label: 'Pounds (lb)' },
    { value: 'gal', label: 'Gallons (gal)' },
    { value: 'qt', label: 'Quarts (qt)' },
    { value: 'pt', label: 'Pints (pt)' },
    { value: 'ml', label: 'Milliliters (ml)' },
    { value: 'L', label: 'Liters (L)' },
    { value: 'g', label: 'Grams (g)' },
    { value: 'kg', label: 'Kilograms (kg)' },
    { value: 'unit', label: 'Units' },
    { value: 'each', label: 'Each' }
  ];
  res.json(units);
});

module.exports = router;
