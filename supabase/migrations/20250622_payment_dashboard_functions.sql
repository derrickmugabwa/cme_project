-- Migration to add functions for the payment tracking dashboard
-- NOTE: This migration will only be run with explicit user approval

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS get_payment_stats();
DROP FUNCTION IF EXISTS get_daily_payment_stats(INTEGER);
DROP FUNCTION IF EXISTS get_payment_method_stats();
DROP FUNCTION IF EXISTS get_monthly_payment_method_stats(INTEGER);
DROP FUNCTION IF EXISTS get_payment_method_summary();
DROP FUNCTION IF EXISTS check_is_admin();

-- Create security definer wrapper function to restrict access to admin users
CREATE OR REPLACE FUNCTION check_is_admin()
RETURNS BOOLEAN AS $$
DECLARE
  is_admin BOOLEAN;
BEGIN
  SELECT role = 'admin' INTO is_admin
  FROM profiles
  WHERE id = auth.uid();
  
  RETURN COALESCE(is_admin, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get overall payment statistics
CREATE OR REPLACE FUNCTION get_payment_stats()
RETURNS JSONB AS $$
DECLARE
  v_total_transactions INTEGER;
  v_total_amount DECIMAL;
  v_completed_transactions INTEGER;
  v_completed_amount DECIMAL;
  v_pending_transactions INTEGER;
  v_pending_amount DECIMAL;
  v_failed_transactions INTEGER;
  v_failed_amount DECIMAL;
BEGIN
  -- Check if user is admin
  IF NOT check_is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;
  -- Get total transactions and amount
  SELECT 
    COUNT(*), 
    COALESCE(SUM(amount), 0)
  INTO 
    v_total_transactions, 
    v_total_amount
  FROM payment_transactions;
  
  -- Get completed transactions and amount
  SELECT 
    COUNT(*), 
    COALESCE(SUM(amount), 0)
  INTO 
    v_completed_transactions, 
    v_completed_amount
  FROM payment_transactions
  WHERE status = 'completed';
  
  -- Get pending transactions and amount
  SELECT 
    COUNT(*), 
    COALESCE(SUM(amount), 0)
  INTO 
    v_pending_transactions, 
    v_pending_amount
  FROM payment_transactions
  WHERE status = 'pending';
  
  -- Get failed transactions and amount
  SELECT 
    COUNT(*), 
    COALESCE(SUM(amount), 0)
  INTO 
    v_failed_transactions, 
    v_failed_amount
  FROM payment_transactions
  WHERE status = 'failed';
  
  -- Return the statistics as JSON
  RETURN jsonb_build_object(
    'totalTransactions', v_total_transactions,
    'totalAmount', v_total_amount,
    'completedTransactions', v_completed_transactions,
    'completedAmount', v_completed_amount,
    'pendingTransactions', v_pending_transactions,
    'pendingAmount', v_pending_amount,
    'failedTransactions', v_failed_transactions,
    'failedAmount', v_failed_amount
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get daily payment statistics
CREATE OR REPLACE FUNCTION get_daily_payment_stats(days_back INTEGER DEFAULT 7)
RETURNS TABLE (
  date DATE,
  transaction_count INTEGER,
  total_amount DECIMAL
) AS $$
BEGIN
  -- Check if user is admin
  IF NOT check_is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;
  RETURN QUERY
  WITH date_series AS (
    SELECT generate_series(
      current_date - (days_back - 1)::integer,
      current_date,
      '1 day'::interval
    )::date AS series_date
  )
  SELECT
    ds.series_date AS date,
    COUNT(pt.id)::INTEGER AS transaction_count,
    COALESCE(SUM(pt.amount), 0)::DECIMAL AS total_amount
  FROM
    date_series ds
  LEFT JOIN
    payment_transactions pt ON date_trunc('day', pt.created_at)::date = ds.series_date
  GROUP BY
    ds.series_date
  ORDER BY
    ds.series_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get payment method statistics
CREATE OR REPLACE FUNCTION get_payment_method_stats()
RETURNS TABLE (
  method TEXT,
  total_transactions INTEGER,
  total_amount DECIMAL,
  completed_transactions INTEGER,
  completed_amount DECIMAL,
  pending_transactions INTEGER,
  pending_amount DECIMAL,
  failed_transactions INTEGER,
  failed_amount DECIMAL,
  success_rate DECIMAL
) AS $$
BEGIN
  -- Check if user is admin
  IF NOT check_is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;
  RETURN QUERY
  WITH method_stats AS (
    SELECT
      payment_method,
      COUNT(*) AS total_txns,
      COALESCE(SUM(amount), 0) AS total_amt,
      COUNT(*) FILTER (WHERE status = 'completed') AS completed_txns,
      COALESCE(SUM(amount) FILTER (WHERE status = 'completed'), 0) AS completed_amt,
      COUNT(*) FILTER (WHERE status = 'pending') AS pending_txns,
      COALESCE(SUM(amount) FILTER (WHERE status = 'pending'), 0) AS pending_amt,
      COUNT(*) FILTER (WHERE status = 'failed') AS failed_txns,
      COALESCE(SUM(amount) FILTER (WHERE status = 'failed'), 0) AS failed_amt
    FROM
      payment_transactions
    GROUP BY
      payment_method
  )
  SELECT
    payment_method AS method,
    total_txns::INTEGER AS total_transactions,
    total_amt::DECIMAL AS total_amount,
    completed_txns::INTEGER AS completed_transactions,
    completed_amt::DECIMAL AS completed_amount,
    pending_txns::INTEGER AS pending_transactions,
    pending_amt::DECIMAL AS pending_amount,
    failed_txns::INTEGER AS failed_transactions,
    failed_amt::DECIMAL AS failed_amount,
    CASE
      WHEN total_txns > 0 THEN
        ROUND((completed_txns::DECIMAL / total_txns::DECIMAL) * 100, 2)
      ELSE
        0
    END AS success_rate
  FROM
    method_stats
  ORDER BY
    total_txns DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get monthly payment method statistics
CREATE OR REPLACE FUNCTION get_monthly_payment_method_stats(months_back INTEGER DEFAULT 6)
RETURNS TABLE (
  year INTEGER,
  month INTEGER,
  payment_method TEXT,
  transaction_count INTEGER,
  total_amount DECIMAL
) AS $$
BEGIN
  -- Check if user is admin
  IF NOT check_is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;
  RETURN QUERY
  WITH month_series AS (
    SELECT
      EXTRACT(YEAR FROM dt)::INTEGER AS year,
      EXTRACT(MONTH FROM dt)::INTEGER AS month
    FROM
      generate_series(
        date_trunc('month', current_date) - ((months_back - 1) || ' month')::interval,
        date_trunc('month', current_date),
        '1 month'::interval
      ) AS dt
  ),
  payment_methods AS (
    SELECT DISTINCT pt.payment_method
    FROM payment_transactions pt
  ),
  month_method_combinations AS (
    SELECT
      ms.year,
      ms.month,
      pm.payment_method AS payment_method
    FROM
      month_series ms
    CROSS JOIN
      payment_methods pm
  )
  SELECT
    mmc.year,
    mmc.month,
    mmc.payment_method,
    COUNT(pt.id)::INTEGER AS transaction_count,
    COALESCE(SUM(pt.amount), 0)::DECIMAL AS total_amount
  FROM
    month_method_combinations mmc
  LEFT JOIN
    payment_transactions pt ON
      EXTRACT(YEAR FROM pt.created_at)::INTEGER = mmc.year AND
      EXTRACT(MONTH FROM pt.created_at)::INTEGER = mmc.month AND
      pt.payment_method::TEXT = mmc.payment_method::TEXT
  GROUP BY
    mmc.year, mmc.month, mmc.payment_method
  ORDER BY
    mmc.year, mmc.month, mmc.payment_method;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get payment method summary for the overview chart
CREATE OR REPLACE FUNCTION get_payment_method_summary()
RETURNS TABLE (
  payment_method TEXT,
  count BIGINT,
  sum DECIMAL
) AS $$
BEGIN
  -- Check if user is admin
  IF NOT check_is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;
  RETURN QUERY
  SELECT
    pt.payment_method,
    COUNT(pt.id),
    COALESCE(SUM(pt.amount), 0)::DECIMAL
  FROM
    payment_transactions pt
  GROUP BY
    pt.payment_method
  ORDER BY
    COUNT(pt.id) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions for RLS
GRANT EXECUTE ON FUNCTION get_payment_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_daily_payment_stats(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_payment_method_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_monthly_payment_method_stats(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_payment_method_summary() TO authenticated;

-- Add RLS policies to restrict access to admin users only
ALTER FUNCTION get_payment_stats() SET search_path = public;
ALTER FUNCTION get_daily_payment_stats(INTEGER) SET search_path = public;
ALTER FUNCTION get_payment_method_stats() SET search_path = public;
ALTER FUNCTION get_monthly_payment_method_stats(INTEGER) SET search_path = public;

COMMENT ON FUNCTION get_payment_stats() IS 'Get overall payment statistics - admin only';
COMMENT ON FUNCTION get_daily_payment_stats(INTEGER) IS 'Get daily payment statistics for the specified number of days back - admin only';
COMMENT ON FUNCTION get_payment_method_stats() IS 'Get statistics for each payment method - admin only';
COMMENT ON FUNCTION get_monthly_payment_method_stats(INTEGER) IS 'Get monthly statistics for each payment method - admin only';
