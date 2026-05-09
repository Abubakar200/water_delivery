-- ============================================================
-- WATER DELIVERY MANAGEMENT SYSTEM - DATABASE SCRIPT
-- Architecture: Multi-Tenant (Organisation Based)
-- Last Updated: 2026-05-09
-- ============================================================

CREATE DATABASE IF NOT EXISTS water_delivery_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE water_delivery_db;

-- ============================================================
-- 1. ORGANISATIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS organisations (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(150) NOT NULL,
  slug        VARCHAR(150) NOT NULL UNIQUE,   -- e.g. "aqua-pure-lahore"
  logo        VARCHAR(255),
  phone       VARCHAR(20),
  address     TEXT,
  is_active   TINYINT(1) DEFAULT 1,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================================
-- 2. ROLES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS roles (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(50) NOT NULL UNIQUE,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================================
-- 3. USERS TABLE  (global — ek email multiple orgs mein ho sakta hai)
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  email       VARCHAR(150) NOT NULL UNIQUE,
  phone       VARCHAR(20),
  password    VARCHAR(255) NOT NULL,
  is_active   TINYINT(1) DEFAULT 1,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================================
-- 4. ORGANISATION MEMBERS
--    Ek user multiple orgs ka member ho sakta hai
--    Har org mein alag role ho sakta hai
-- ============================================================
CREATE TABLE IF NOT EXISTS organisation_members (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  organisation_id INT UNSIGNED NOT NULL,
  user_id         INT UNSIGNED NOT NULL,
  role_id         INT UNSIGNED NOT NULL,
  is_active       TINYINT(1) DEFAULT 1,
  joined_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_om_org  FOREIGN KEY (organisation_id) REFERENCES organisations(id) ON DELETE CASCADE,
  CONSTRAINT fk_om_user FOREIGN KEY (user_id)         REFERENCES users(id)         ON DELETE CASCADE,
  CONSTRAINT fk_om_role FOREIGN KEY (role_id)         REFERENCES roles(id),
  UNIQUE KEY uq_org_user (organisation_id, user_id)
);

-- ============================================================
-- 5. REFRESH TOKENS TABLE  (org scoped)
-- ============================================================
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id         INT UNSIGNED NOT NULL,
  organisation_id INT UNSIGNED NOT NULL,
  token           TEXT NOT NULL,
  expires_at      DATETIME NOT NULL,
  is_revoked      TINYINT(1) DEFAULT 0,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_rt_user FOREIGN KEY (user_id)         REFERENCES users(id)         ON DELETE CASCADE,
  CONSTRAINT fk_rt_org  FOREIGN KEY (organisation_id) REFERENCES organisations(id) ON DELETE CASCADE
);

-- ============================================================
-- 6. ZONES TABLE  (org scoped)
-- ============================================================
CREATE TABLE IF NOT EXISTS zones (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  organisation_id INT UNSIGNED NOT NULL,
  name            VARCHAR(100) NOT NULL,
  description     TEXT,
  is_active       TINYINT(1) DEFAULT 1,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_zone_org FOREIGN KEY (organisation_id) REFERENCES organisations(id) ON DELETE CASCADE
);

-- ============================================================
-- 7. CUSTOMERS TABLE  (org scoped)
-- ============================================================
CREATE TABLE IF NOT EXISTS customers (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  organisation_id INT UNSIGNED NOT NULL,
  name            VARCHAR(100) NOT NULL,
  phone           VARCHAR(20)  NOT NULL,
  address         TEXT,
  latitude        DECIMAL(10, 8),
  longitude       DECIMAL(11, 8),
  zone_id         INT UNSIGNED,
  balance         DECIMAL(10, 2) DEFAULT 0.00,
  security_amount DECIMAL(10, 2) DEFAULT 0.00,
  bottles_at_hand INT DEFAULT 0,
  is_active       TINYINT(1) DEFAULT 1,
  last_order_date DATE,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_cust_org  FOREIGN KEY (organisation_id) REFERENCES organisations(id) ON DELETE CASCADE,
  CONSTRAINT fk_cust_zone FOREIGN KEY (zone_id)         REFERENCES zones(id)
);

-- ============================================================
-- 8. PRODUCTS TABLE  (org scoped)
-- ============================================================
CREATE TABLE IF NOT EXISTS products (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  organisation_id INT UNSIGNED NOT NULL,
  name            VARCHAR(100) NOT NULL,
  unit            VARCHAR(30) DEFAULT 'bottle',
  price           DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  is_active       TINYINT(1) DEFAULT 1,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_prod_org FOREIGN KEY (organisation_id) REFERENCES organisations(id) ON DELETE CASCADE
);

-- ============================================================
-- 9. CUSTOMER PRODUCT RATES
-- ============================================================
CREATE TABLE IF NOT EXISTS customer_rates (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  customer_id INT UNSIGNED NOT NULL,
  product_id  INT UNSIGNED NOT NULL,
  rate        DECIMAL(10, 2) NOT NULL,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_cr_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  CONSTRAINT fk_cr_product  FOREIGN KEY (product_id)  REFERENCES products(id),
  UNIQUE KEY uq_customer_product (customer_id, product_id)
);

-- ============================================================
-- 10. ORDERS TABLE  (org scoped)
-- ============================================================
CREATE TABLE IF NOT EXISTS orders (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  organisation_id INT UNSIGNED NOT NULL,
  customer_id     INT UNSIGNED NOT NULL,
  rider_id        INT UNSIGNED,
  status          ENUM('pending','assigned','delivered','cancelled') DEFAULT 'pending',
  total_amount    DECIMAL(10, 2) DEFAULT 0.00,
  notes           TEXT,
  order_date      DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_order_org      FOREIGN KEY (organisation_id) REFERENCES organisations(id),
  CONSTRAINT fk_order_customer FOREIGN KEY (customer_id)     REFERENCES customers(id),
  CONSTRAINT fk_order_rider    FOREIGN KEY (rider_id)        REFERENCES users(id)
);

-- ============================================================
-- 11. ORDER ITEMS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS order_items (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id   INT UNSIGNED NOT NULL,
  product_id INT UNSIGNED NOT NULL,
  quantity   INT NOT NULL DEFAULT 1,
  unit_price DECIMAL(10, 2) NOT NULL,
  subtotal   DECIMAL(10, 2) NOT NULL,
  CONSTRAINT fk_oi_order   FOREIGN KEY (order_id)   REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_oi_product FOREIGN KEY (product_id) REFERENCES products(id)
);

-- ============================================================
-- 12. DELIVERIES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS deliveries (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id          INT UNSIGNED NOT NULL,
  rider_id          INT UNSIGNED NOT NULL,
  bottles_delivered INT DEFAULT 0,
  empties_received  INT DEFAULT 0,
  delivery_time     DATETIME,
  rider_lat         DECIMAL(10, 8),
  rider_lng         DECIMAL(11, 8),
  is_verified       TINYINT(1) DEFAULT 0,
  created_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_del_order FOREIGN KEY (order_id) REFERENCES orders(id),
  CONSTRAINT fk_del_rider FOREIGN KEY (rider_id) REFERENCES users(id)
);

-- ============================================================
-- 13. PAYMENTS TABLE  (org scoped)
-- ============================================================
CREATE TABLE IF NOT EXISTS payments (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  organisation_id INT UNSIGNED NOT NULL,
  customer_id     INT UNSIGNED NOT NULL,
  rider_id        INT UNSIGNED,
  amount          DECIMAL(10, 2) NOT NULL,
  payment_type    ENUM('cash','advance','security') DEFAULT 'cash',
  reference       VARCHAR(100),
  notes           TEXT,
  paid_at         DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_pay_org      FOREIGN KEY (organisation_id) REFERENCES organisations(id),
  CONSTRAINT fk_pay_customer FOREIGN KEY (customer_id)     REFERENCES customers(id),
  CONSTRAINT fk_pay_rider    FOREIGN KEY (rider_id)        REFERENCES users(id)
);

-- ============================================================
-- 14. STOCK TRANSACTIONS TABLE  (org scoped)
-- ============================================================
CREATE TABLE IF NOT EXISTS stock_transactions (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  organisation_id INT UNSIGNED NOT NULL,
  product_id      INT UNSIGNED NOT NULL,
  type            ENUM('in','out','return') NOT NULL,
  quantity        INT NOT NULL,
  reference_id    INT UNSIGNED,
  notes           TEXT,
  created_by      INT UNSIGNED,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_st_org     FOREIGN KEY (organisation_id) REFERENCES organisations(id),
  CONSTRAINT fk_st_product FOREIGN KEY (product_id)      REFERENCES products(id),
  CONSTRAINT fk_st_user    FOREIGN KEY (created_by)      REFERENCES users(id)
);

-- ============================================================
-- 15. RIDER LOCATIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS rider_locations (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  rider_id        INT UNSIGNED NOT NULL,
  organisation_id INT UNSIGNED NOT NULL,
  latitude        DECIMAL(10, 8) NOT NULL,
  longitude       DECIMAL(11, 8) NOT NULL,
  recorded_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_rl_rider FOREIGN KEY (rider_id)        REFERENCES users(id)         ON DELETE CASCADE,
  CONSTRAINT fk_rl_org   FOREIGN KEY (organisation_id) REFERENCES organisations(id)
);

-- ============================================================
-- 16. NOTIFICATIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  organisation_id INT UNSIGNED,
  user_id         INT UNSIGNED,
  customer_id     INT UNSIGNED,
  type            VARCHAR(50),
  message         TEXT NOT NULL,
  is_sent         TINYINT(1) DEFAULT 0,
  sent_at         DATETIME,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_notif_org      FOREIGN KEY (organisation_id) REFERENCES organisations(id),
  CONSTRAINT fk_notif_user     FOREIGN KEY (user_id)         REFERENCES users(id),
  CONSTRAINT fk_notif_customer FOREIGN KEY (customer_id)     REFERENCES customers(id)
);

-- ============================================================
-- SEED — Roles
-- ============================================================
INSERT IGNORE INTO roles (name) VALUES
  ('admin'), ('rider'), ('order_taker'), ('manager');

-- ============================================================
-- SEED — Demo Organisations
-- ============================================================
INSERT IGNORE INTO organisations (name, slug, phone, address) VALUES
  ('Aqua Pure Water',   'aqua-pure-water',   '03001111111', 'Lahore, Pakistan'),
  ('Istanbul Water',    'istanbul-water',     '03002222222', 'Karachi, Pakistan'),
  ('Indus Pure Water',  'indus-pure-water',   '03003333333', 'Islamabad, Pakistan');

-- ============================================================
-- SEED — Super Admin User
-- Password: Admin@123  → update hash after first bcrypt run
-- ============================================================
INSERT IGNORE INTO users (name, email, phone, password) VALUES (
  'Super Admin',
  'admin@waterdelivery.com',
  '03001234567',
  '$2b$10$PLACEHOLDER_REPLACE_WITH_REAL_BCRYPT_HASH'
);

-- ============================================================
-- SEED — Link Admin to All Demo Organisations
-- ============================================================
INSERT IGNORE INTO organisation_members (organisation_id, user_id, role_id)
SELECT o.id, u.id, r.id
FROM organisations o
JOIN users u ON u.email = 'admin@waterdelivery.com'
JOIN roles r ON r.name = 'admin';