CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY,
  type TEXT NOT NULL,
  base_token TEXT NOT NULL,
  quote_token TEXT NOT NULL,
  side TEXT NOT NULL,
  amount_in NUMERIC NOT NULL,
  slippage_bps INTEGER NOT NULL,
  status TEXT NOT NULL,
  selected_dex TEXT,
  executed_price NUMERIC,
  tx_hash TEXT,
  failure_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders (created_at DESC);
