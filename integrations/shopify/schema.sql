-- Merchant connector database only. Apply after examples/webhook-receiver/schema.sql.
CREATE TABLE merchant_shopify_orders(reference text PRIMARY KEY REFERENCES merchant_orders(reference),shop text NOT NULL,order_gid text NOT NULL,UNIQUE(shop,order_gid));
CREATE TABLE merchant_shopify_recordings(reference text PRIMARY KEY REFERENCES merchant_shopify_orders(reference),payment_id uuid NOT NULL UNIQUE,state text NOT NULL CHECK(state IN('sending','recorded','failed','unknown')),started_at timestamptz NOT NULL DEFAULT now(),finished_at timestamptz);
