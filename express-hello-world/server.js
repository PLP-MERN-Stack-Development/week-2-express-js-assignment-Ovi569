const express = require('express');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 3000;

app.use(bodyParser.json());

let products = [];

// GET /api/products - List all products
app.get('/api/products', (req, res) => {
    res.json(products);
});

// GET /api/products/:id - Get a specific product by ID
app.get('/api/products/:id', (req, res) => {
    const product = products.find(p => p.id === req.params.id);
    if (!product) {
        return res.status(404).json({ message: 'Product not found' });
    }
    res.json(product);
});

// POST /api/products - Create a new product
app.post('/api/products', (req, res) => {
    const { name, description, price, category, inStock } = req.body;
    if (
        typeof name !== 'string' ||
        typeof description !== 'string' ||
        typeof price !== 'number' ||
        typeof category !== 'string' ||
        typeof inStock !== 'boolean'
    ) {
        return res.status(400).json({ message: 'Invalid product data' });
    }
    const newProduct = {
        id: uuidv4(),
        name,
        description,
        price,
        category,
        inStock
    };
    products.push(newProduct);
    res.status(201).json(newProduct);
});

// PUT /api/products/:id - Update an existing product
app.put('/api/products/:id', (req, res) => {
    const { name, description, price, category, inStock } = req.body;
    const productIndex = products.findIndex(p => p.id === req.params.id);
    if (productIndex === -1) {
        return res.status(404).json({ message: 'Product not found' });
    }
    const updatedProduct = {
        ...products[productIndex],
        name: typeof name === 'string' ? name : products[productIndex].name,
        description: typeof description === 'string' ? description : products[productIndex].description,
        price: typeof price === 'number' ? price : products[productIndex].price,
        category: typeof category === 'string' ? category : products[productIndex].category,
        inStock: typeof inStock === 'boolean' ? inStock : products[productIndex].inStock
    };
    products[productIndex] = updatedProduct;
    res.json(updatedProduct);
});

// DELETE /api/products/:id - Delete a product
app.delete('/api/products/:id', (req, res) => {
    const productIndex = products.findIndex(p => p.id === req.params.id);
    if (productIndex === -1) {
        return res.status(404).json({ message: 'Product not found' });
    }
    const deletedProduct = products.splice(productIndex, 1)[0];
    res.json(deletedProduct);
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

/**
 * Custom logger middleware
 */
function logger(req, res, next) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.originalUrl}`);
    next();
}
app.use(logger);

function authenticate(req, res, next) {
    const apiKey = req.headers['x-api-key'];
    if (apiKey !== 'your-secret-api-key') {
        return res.status(401).json({ message: 'Unauthorized: Invalid API key' });
    }
    next();
}
// Apply authentication to all product routes
app.use('/api/products', authenticate);

/**
 * Validation middleware for product creation and update
 */
function validateProduct(req, res, next) {
    const { name, description, price, category, inStock } = req.body;
    if (
        typeof name !== 'string' ||
        typeof description !== 'string' ||
        typeof price !== 'number' ||
        typeof category !== 'string' ||
        typeof inStock !== 'boolean'
    ) {
        return res.status(400).json({ message: 'Invalid product data' });
    }
    next();
}

// Apply validation middleware to POST and PUT routes
app.post('/api/products', validateProduct);
app.put('/api/products/:id', validateProduct);

/**
 * Custom Error Classes
 */
class NotFoundError extends Error {
    constructor(message) {
        super(message);
        this.name = 'NotFoundError';
        this.statusCode = 404;
    }
}

class ValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ValidationError';
        this.statusCode = 400;
    }
}

/**
 * Async wrapper to handle errors in async route handlers
 */
const asyncHandler = fn => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Global Error Handling Middleware
 */
app.use((err, req, res, next) => {
    if (err instanceof NotFoundError || err instanceof ValidationError) {
        return res.status(err.statusCode).json({ message: err.message });
    }
    if (err.statusCode) {
        return res.status(err.statusCode).json({ message: err.message });
    }
    console.error(err);
    res.status(500).json({ message: 'Internal Server Error' });
});

/**
 * GET /api/products?category=...&page=...&limit=...
 * List products with optional filtering and pagination
 */
app.get('/api/products', (req, res) => {
    let filtered = products;

    // Filter by category
    if (req.query.category) {
        filtered = filtered.filter(p => p.category === req.query.category);
    }

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const start = (page - 1) * limit;
    const end = start + limit;
    const paginated = filtered.slice(start, end);

    res.json({
        total: filtered.length,
        page,
        limit,
        products: paginated
    });
});

/**
 * GET /api/products/search?name=...
 * Search products by name (case-insensitive)
 */
app.get('/api/products/search', (req, res) => {
    const name = req.query.name || '';
    const results = products.filter(p =>
        p.name.toLowerCase().includes(name.toLowerCase())
    );
    res.json(results);
});

/**
 * GET /api/products/stats
 * Get product statistics (count by category)
 */
app.get('/api/products/stats', (req, res) => {
    const stats = {};
    products.forEach(p => {
        stats[p.category] = (stats[p.category] || 0) + 1;
    });
    res.json(stats);
});