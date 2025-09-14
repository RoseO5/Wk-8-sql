-- week8_assignment.sql
-- Create database
CREATE DATABASE IF NOT EXISTS ecommerce_db
  DEFAULT CHARACTER SET = utf8mb4
  DEFAULT COLLATE = utf8mb4_general_ci;

USE ecommerce_db;

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
  customer_id INT AUTO_INCREMENT PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(30),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  category_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT
) ENGINE=InnoDB;

-- Products table
CREATE TABLE IF NOT EXISTS products (
  product_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  sku VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  quantity INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Many-to-many: product_categories
CREATE TABLE IF NOT EXISTS product_categories (
  product_id INT NOT NULL,
  category_id INT NOT NULL,
  PRIMARY KEY (product_id, category_id),
  CONSTRAINT fk_pc_product FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE,
  CONSTRAINT fk_pc_category FOREIGN KEY (category_id) REFERENCES categories(category_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  order_id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT NOT NULL,
  status ENUM('pending','paid','shipped','cancelled') NOT NULL DEFAULT 'pending',
  total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_order_customer FOREIGN KEY (customer_id) REFERENCES customers(customer_id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- Order items: many-to-many between orders and products with quantity/price
CREATE TABLE IF NOT EXISTS order_items (
  order_item_id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  product_id INT NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  quantity INT NOT NULL,
  line_total DECIMAL(12,2) NOT NULL,
  CONSTRAINT fk_oi_order FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE,
  CONSTRAINT fk_oi_product FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- Example data (optional):
INSERT INTO categories (name, description) VALUES
('Electronics','Phones, laptops and accessories'),
('Books','Printed and electronic books');

INSERT INTO products (name, sku, description, price, quantity) VALUES
('USB-C Charger','SKU-UC-001','Fast charger 20W', 9.99, 150),
('Novel: The Island','SKU-BOOK-001','A fiction novel', 12.50, 60);

INSERT INTO customers (first_name,last_name,email,phone) VALUES
('Alice','Johnson','alice@example.com','+2348010000000'),
('Bob','Oke','bob@example.com','+2348020000001');

-- Link product -> category
INSERT INTO product_categories (product_id, category_id) VALUES
(1,1),(2,2);


