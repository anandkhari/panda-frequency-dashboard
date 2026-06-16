-- Adds the booking-outcome breakdown columns that were dropped when
-- joined_customers moved from a single JSON blob into normalized tables.
-- Run this once in the Supabase SQL editor, then re-upload the CSVs
-- (or re-publish) so the new columns get populated.

ALTER TABLE customer_snapshots
  ADD COLUMN IF NOT EXISTS full_profit integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS full_profit_gross integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS partial_refund integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS partial_refund_gross integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS partial_refund_refunded integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS full_refund integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS full_refund_gross integer DEFAULT 0;

ALTER TABLE published_customers
  ADD COLUMN IF NOT EXISTS full_profit integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS full_profit_gross integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS partial_refund integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS partial_refund_gross integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS partial_refund_refunded integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS full_refund integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS full_refund_gross integer DEFAULT 0;
