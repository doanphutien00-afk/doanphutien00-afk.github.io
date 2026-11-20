-- Cơ sở dữ liệu bản quyền PT Plugins (Cloudflare D1 / SQLite)
CREATE TABLE IF NOT EXISTS orders (
  code        TEXT PRIMARY KEY,          -- nội dung chuyển khoản, vd. PTK7M2Q9
  email       TEXT NOT NULL,
  uid         TEXT,
  product     TEXT NOT NULL,
  amount      INTEGER NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending',   -- pending | paid | expired | cancelled
  created     INTEGER NOT NULL,          -- unix giây
  paid_at     INTEGER,
  payment_id  TEXT,                      -- id giao dịch SePay
  paid_amount INTEGER,
  note        TEXT
);
CREATE INDEX IF NOT EXISTS orders_email ON orders(email);

CREATE TABLE IF NOT EXISTS licenses (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  email       TEXT NOT NULL,
  product     TEXT NOT NULL,
  order_code  TEXT,
  created     INTEGER NOT NULL,
  revoked     INTEGER NOT NULL DEFAULT 0,
  last_self_reset INTEGER,
  note        TEXT,
  UNIQUE(email, product)
);

CREATE TABLE IF NOT EXISTS devices (
  license_id  INTEGER NOT NULL,
  device_id   TEXT NOT NULL,
  name        TEXT,
  activated   INTEGER NOT NULL,
  last_seen   INTEGER NOT NULL,
  PRIMARY KEY (license_id, device_id)
);

CREATE TABLE IF NOT EXISTS trials (
  device_id   TEXT NOT NULL,
  product     TEXT NOT NULL,
  started     INTEGER NOT NULL,
  PRIMARY KEY (device_id, product)
);

CREATE TABLE IF NOT EXISTS payments (
  id          TEXT PRIMARY KEY,          -- id giao dịch SePay (chống ghi trùng)
  order_code  TEXT,
  amount      INTEGER,
  content     TEXT,
  raw         TEXT,
  created     INTEGER NOT NULL
);
