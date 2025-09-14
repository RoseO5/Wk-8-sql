// server.js
// Simple Express CRUD app using mysql2/promise

require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// create pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'ecommerce_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// --- Products CRUD ---

// GET /products
app.get('/products', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM products');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// GET /products/:id
app.get('/products/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM products WHERE product_id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Product not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// POST /products
app.post('/products', async (req, res) => {
  try {
    const { name, sku, description, price = 0.00, quantity = 0 } = req.body;
    if (!name || !sku) return res.status(400).json({ error: 'name and sku required' });
    const [result] = await pool.query(
      'INSERT INTO products (name, sku, description, price, quantity) VALUES (?, ?, ?, ?, ?)',
      [name, sku, description, price, quantity]
    );
    const [rows] = await pool.query('SELECT * FROM products WHERE product_id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'SKU must be unique' });
    res.status(500).json({ error: 'Database error' });
  }
});

// PUT /products/:id
app.put('/products/:id', async (req, res) => {
  try {
    const { name, sku, description, price, quantity } = req.body;
    const [result] = await pool.query(
      'UPDATE products SET name = COALESCE(?, name), sku = COALESCE(?, sku), description = COALESCE(?, description), price = COALESCE(?, price), quantity = COALESCE(?, quantity) WHERE product_id = ?',
      [name, sku, description, price, quantity, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Product not found' });
    const [rows] = await pool.query('SELECT * FROM products WHERE product_id = ?', [req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// DELETE /products/:id
app.delete('/products/:id', async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM products WHERE product_id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Product not found' });
    res.json({ message: 'Product deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// --- Orders CRUD (basic) ---

// GET /orders
app.get('/orders', async (req, res) => {
  try {
    const [orders] = await pool.query('SELECT * FROM orders');
    res.json(orders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// GET /orders/:id (with items)
app.get('/orders/:id', async (req, res) => {
  try {
    const [[order]] = await pool.query('SELECT * FROM orders WHERE order_id = ?', [req.params.id]);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    const [items] = await pool.query('SELECT oi.*, p.name FROM order_items oi JOIN products p ON oi.product_id = p.product_id WHERE oi.order_id = ?', [req.params.id]);
    order.items = items;
    res.json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// POST /orders
// body: { customer_id: number, items: [{ product_id, quantity }] }
app.post('/orders', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { customer_id, items } = req.body;
    if (!customer_id || !Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'customer_id and items required' });

    await conn.beginTransaction();

    // create order
    const [orderRes] = await conn.query('INSERT INTO orders (customer_id, total) VALUES (?, 0)', [customer_id]);
    const orderId = orderRes.insertId;

    let total = 0;
    for (const it of items) {
      const [pRows] = await conn.query('SELECT price, quantity AS stock FROM products WHERE product_id = ? FOR UPDATE', [it.product_id]);
      if (pRows.length === 0) throw new Error(`Product ${it.product_id} not found`);
      const product = pRows[0];
      if (product.stock < it.quantity) throw new Error(`Insufficient stock for product ${it.product_id}`);
      const unitPrice = product.price;
      const lineTotal = +(unitPrice * it.quantity).toFixed(2);
      total += lineTotal;

      // insert order item
      await conn.query('INSERT INTO order_items (order_id, product_id, unit_price, quantity, line_total) VALUES (?, ?, ?, ?, ?)', [orderId, it.product_id, unitPrice, it.quantity, lineTotal]);

      // decrement stock
      await conn.query('UPDATE products SET quantity = quantity - ? WHERE product_id = ?', [it.quantity, it.product_id]);
    }

    // update order total
    await conn.query('UPDATE orders SET total = ? WHERE order_id = ?', [total.toFixed(2), orderId]);

    await conn.commit();

    const [[createdOrder]] = await pool.query('SELECT * FROM orders WHERE order_id = ?', [orderId]);
    const [createdItems] = await pool.query('SELECT * FROM order_items WHERE order_id = ?', [orderId]);
    createdOrder.items = createdItems;

    res.status(201).json(createdOrder);
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(400).json({ error: err.message || 'Error creating order' });
  } finally {
    conn.release();
  }
});

// PUT /orders/:id -> update status
app.put('/orders/:id', async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: 'status required' });
    const [result] = await pool.query('UPDATE orders SET status = ? WHERE order_id = ?', [status, req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Order not found' });
    const [[order]] = await pool.query('SELECT * FROM orders WHERE order_id = ?', [req.params.id]);
    res.json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// DELETE /orders/:id
app.delete('/orders/:id', async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM orders WHERE order_id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Order not found' });
    res.json({ message: 'Order deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// root
app.get('/', (req, res) => res.send('E-commerce CRUD API. Check README for endpoints.'));

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
