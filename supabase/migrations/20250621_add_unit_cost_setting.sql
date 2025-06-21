-- Migration to add unit cost setting functionality
-- This migration adds a table to store the cost per unit and updates the exchange rate function

-- 1. Create unit_cost_settings table
CREATE TABLE IF NOT EXISTS unit_cost_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cost_per_unit DECIMAL NOT NULL DEFAULT 1.00,
  currency TEXT NOT NULL DEFAULT 'KES',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- 2. Insert default unit cost setting
INSERT INTO unit_cost_settings (cost_per_unit, currency)
VALUES (1.00, 'KES');

-- 3. Update the exchange rate function to use the unit cost setting
CREATE OR REPLACE FUNCTION get_units_exchange_rate(
  p_payment_method TEXT DEFAULT NULL
) RETURNS DECIMAL AS $$
DECLARE
  v_cost_per_unit DECIMAL;
BEGIN
  -- Get the current cost per unit from settings
  SELECT cost_per_unit INTO v_cost_per_unit
  FROM unit_cost_settings
  ORDER BY updated_at DESC
  LIMIT 1;
  
  -- If no setting found, use default
  IF v_cost_per_unit IS NULL THEN
    v_cost_per_unit := 1.00;
  END IF;
  
  -- Return the cost per unit
  RETURN v_cost_per_unit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create function to update unit cost
CREATE OR REPLACE FUNCTION update_unit_cost(
  p_cost_per_unit DECIMAL,
  p_currency TEXT DEFAULT 'KES',
  p_user_id UUID DEFAULT auth.uid()
) RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Validate input
  IF p_cost_per_unit <= 0 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Cost per unit must be greater than zero');
  END IF;
  
  -- Insert new unit cost setting
  INSERT INTO unit_cost_settings (cost_per_unit, currency, updated_by)
  VALUES (p_cost_per_unit, p_currency, p_user_id)
  RETURNING jsonb_build_object(
    'id', id,
    'cost_per_unit', cost_per_unit,
    'currency', currency,
    'updated_at', updated_at
  ) INTO v_result;
  
  RETURN jsonb_build_object('success', true, 'data', v_result);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create function to get current unit cost
CREATE OR REPLACE FUNCTION get_current_unit_cost() 
RETURNS JSONB AS $$
DECLARE
  v_setting RECORD;
BEGIN
  -- Get the most recent unit cost setting
  SELECT * INTO v_setting
  FROM unit_cost_settings
  ORDER BY updated_at DESC
  LIMIT 1;
  
  -- If no setting found, return default
  IF v_setting IS NULL THEN
    RETURN jsonb_build_object(
      'cost_per_unit', 1.00,
      'currency', 'KES',
      'updated_at', now()
    );
  END IF;
  
  -- Return the current setting
  RETURN jsonb_build_object(
    'cost_per_unit', v_setting.cost_per_unit,
    'currency', v_setting.currency,
    'updated_at', v_setting.updated_at
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Grant permissions for RLS
ALTER TABLE unit_cost_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can view unit cost settings
CREATE POLICY "Admins can view unit cost settings" 
  ON unit_cost_settings FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Only admins can insert unit cost settings
CREATE POLICY "Admins can insert unit cost settings" 
  ON unit_cost_settings FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
