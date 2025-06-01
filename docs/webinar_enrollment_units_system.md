# Webinar Enrollment System with Units

## 1. Overview

This document outlines the implementation plan for a units-based enrollment system for webinars. The system will allow users to enroll in webinar sessions using units from their wallet. Administrators will be able to define unit requirements for webinars and manage users' unit balances.

## 2. Current Schema Analysis

Based on our current database schema, we have:

- **profiles**: Stores user information including role (admin, faculty, user)
- **sessions**: Contains webinar session details including title, description, start/end times
- **session_attendance**: Tracks user attendance for sessions with approval workflow

We currently don't have:
- A units wallet system for users
- Session enrollment tracking separate from attendance
- Unit requirements for sessions
- Transaction history for unit operations

## 3. Database Schema Updates Required

### 3.1 Create Units Wallet Table

```sql
-- Units wallet table
CREATE TABLE user_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) UNIQUE,
  units INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add RLS policies
ALTER TABLE user_units ENABLE ROW LEVEL SECURITY;

-- Policy for users to view their own units
CREATE POLICY "Users can view their own units"
  ON user_units
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy for admins to view all units
CREATE POLICY "Admins can view all units"
  ON user_units
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin')
  ));

-- Policy for admins to update units
CREATE POLICY "Admins can update units"
  ON user_units
  FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin')
  ));
```

### 3.2 Create Session Enrollment Table

```sql
-- Session enrollments table
CREATE TABLE session_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  session_id UUID NOT NULL REFERENCES sessions(id),
  status TEXT NOT NULL DEFAULT 'enrolled',
  units_spent INTEGER NOT NULL DEFAULT 0,
  UNIQUE(user_id, session_id)
);

-- Add RLS policies
ALTER TABLE session_enrollments ENABLE ROW LEVEL SECURITY;

-- Policy for users to view their own enrollments
CREATE POLICY "Users can view their own enrollments"
  ON session_enrollments
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy for users to insert their own enrollments
CREATE POLICY "Users can insert their own enrollments"
  ON session_enrollments
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy for admins to view all enrollments
CREATE POLICY "Admins can view all enrollments"
  ON session_enrollments
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'faculty')
  ));
```

### 3.3 Create Session Unit Requirements Table

```sql
-- Session units requirement table
CREATE TABLE session_unit_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) UNIQUE,
  units_required INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add RLS policies
ALTER TABLE session_unit_requirements ENABLE ROW LEVEL SECURITY;

-- Policy for everyone to view unit requirements
CREATE POLICY "Everyone can view unit requirements"
  ON session_unit_requirements
  FOR SELECT
  USING (true);

-- Policy for admins to manage unit requirements
CREATE POLICY "Admins can manage unit requirements"
  ON session_unit_requirements
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin')
  ));
```

### 3.4 Create Unit Transactions Table

```sql
-- Units transaction history
CREATE TABLE unit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  amount INTEGER NOT NULL,
  transaction_type TEXT NOT NULL, -- 'topup', 'enrollment', 'refund', etc.
  reference_id UUID, -- Optional reference to session_id or payment_id
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES profiles(id)
);

-- Add RLS policies
ALTER TABLE unit_transactions ENABLE ROW LEVEL SECURITY;

-- Policy for users to view their own transactions
CREATE POLICY "Users can view their own transactions"
  ON unit_transactions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy for admins to view all transactions
CREATE POLICY "Admins can view all transactions"
  ON unit_transactions
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin')
  ));

-- Policy for admins to insert transactions
CREATE POLICY "Admins can insert transactions"
  ON unit_transactions
  FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin')
  ));
```

## 4. Database Functions

### 4.1 Top Up Units Function

```sql
CREATE OR REPLACE FUNCTION topup_user_units(
  p_user_id UUID,
  p_amount INTEGER,
  p_notes TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_transaction_id UUID;
BEGIN
  -- Check if user exists in user_units
  INSERT INTO user_units (user_id, units)
  VALUES (p_user_id, 0)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Update user's units
  UPDATE user_units
  SET units = units + p_amount,
      updated_at = now()
  WHERE user_id = p_user_id;
  
  -- Record transaction
  INSERT INTO unit_transactions (
    user_id,
    amount,
    transaction_type,
    notes,
    created_by
  ) VALUES (
    p_user_id,
    p_amount,
    'topup',
    p_notes,
    auth.uid()
  ) RETURNING id INTO v_transaction_id;
  
  RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 4.2 Enroll in Session Function

```sql
CREATE OR REPLACE FUNCTION enroll_in_session(
  p_session_id UUID,
  p_user_id UUID DEFAULT auth.uid()
) RETURNS BOOLEAN AS $$
DECLARE
  v_units_required INTEGER;
  v_user_units INTEGER;
BEGIN
  -- Get units required for this session
  SELECT units_required INTO v_units_required
  FROM session_unit_requirements
  WHERE session_id = p_session_id;
  
  -- If no requirement found, default to 1 unit
  IF v_units_required IS NULL THEN
    v_units_required := 1;
  END IF;
  
  -- Get user's current units
  SELECT units INTO v_user_units
  FROM user_units
  WHERE user_id = p_user_id;
  
  -- If user has no units record, create one with 0 units
  IF v_user_units IS NULL THEN
    INSERT INTO user_units (user_id, units)
    VALUES (p_user_id, 0)
    RETURNING units INTO v_user_units;
  END IF;
  
  -- Check if user has enough units
  IF v_user_units < v_units_required THEN
    RAISE EXCEPTION 'Insufficient units. Required: %, Available: %', v_units_required, v_user_units;
  END IF;
  
  -- Begin transaction
  BEGIN
    -- Deduct units from user's wallet
    UPDATE user_units
    SET units = units - v_units_required,
        updated_at = now()
    WHERE user_id = p_user_id;
    
    -- Create enrollment record
    INSERT INTO session_enrollments (
      user_id,
      session_id,
      units_spent
    ) VALUES (
      p_user_id,
      p_session_id,
      v_units_required
    );
    
    -- Record transaction
    INSERT INTO unit_transactions (
      user_id,
      amount,
      transaction_type,
      reference_id,
      notes,
      created_by
    ) VALUES (
      p_user_id,
      -v_units_required,
      'enrollment',
      p_session_id,
      'Enrollment in session',
      p_user_id
    );
    
    RETURN TRUE;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## 5. API Endpoints

### 5.1 Units Management

- **GET /api/units**
  - Get current user's unit balance
  - Response: `{ units: number }`

- **GET /api/units/transactions**
  - Get user's transaction history
  - Response: Array of transaction records

- **POST /api/admin/units/topup**
  - Admin endpoint to add units to a user
  - Request: `{ userId: string, amount: number, notes?: string }`
  - Response: `{ transactionId: string }`

### 5.2 Session Enrollment

- **POST /api/sessions/:id/enroll**
  - Enroll in a session (with unit check)
  - Response: `{ success: boolean, enrollment: object }`

- **GET /api/sessions/:id/enrollment-status**
  - Check if user is enrolled
  - Response: `{ enrolled: boolean, enrollmentDate?: string }`

- **GET /api/sessions/enrolled**
  - Get all sessions user is enrolled in
  - Response: Array of session objects with enrollment info

### 5.3 Admin Endpoints

- **GET /api/admin/units/users**
  - Get all users with their unit balances
  - Response: Array of user objects with unit info

- **POST /api/admin/sessions/:id/units**
  - Set unit requirement for a session
  - Request: `{ unitsRequired: number }`
  - Response: `{ success: boolean }`

## 6. Frontend Components

### 6.1 User Components

#### Units Wallet Component
- Display current balance
- Show transaction history
- Visual indicators for low balance

#### Session Enrollment Button
- Show unit requirement
- Disable if insufficient units
- Confirm enrollment with unit deduction warning

#### My Enrollments Page
- List of enrolled sessions
- Filter by upcoming/past
- Quick access to session details

### 6.2 Admin Components

#### Unit Management Dashboard
- Overview of total units in system
- List of users with unit balances
- Bulk top-up functionality

#### User Unit Top-up Interface
- Search for user
- Enter amount to top up
- Add notes for record-keeping

#### Session Unit Requirement Configuration
- Set default unit requirement
- Override for specific sessions
- Bulk update options

## 7. Implementation Plan

### Phase 1: Database Setup (Week 1)
- Create the necessary tables
- Set up RLS policies
- Create database functions for unit operations

### Phase 2: Core API Implementation (Week 2)
- Implement unit balance and transaction endpoints
- Build enrollment with unit check functionality
- Create admin endpoints for unit management

### Phase 3: Frontend Integration (Week 3)
- Build units wallet UI
- Update session detail page with enrollment requirements
- Create admin interfaces for unit management

### Phase 4: Testing & Refinement (Week 4)
- Test enrollment flows
- Ensure proper unit deduction
- Verify access control works correctly

## 8. Integration with Existing Features

### 8.1 Session Detail Page
- Add enrollment section with unit requirement
- Show enrollment status if already enrolled
- Restrict access to webinar content for non-enrolled users

### 8.2 Dashboard
- Add units wallet widget
- Show upcoming enrolled sessions
- Low unit balance notifications

### 8.3 Attendance System
- Only allow attendance tracking for enrolled users
- Link enrollment and attendance records for reporting

## 9. Future Enhancements

### 9.1 Payment Integration
- Allow users to purchase units
- Integration with payment gateways
- Receipt generation

### 9.2 Subscription Model
- Monthly subscription for unlimited webinars
- Different tiers with varying unit allocations
- Auto-renewal functionality

### 9.3 Promotional Features
- Discount codes for reduced unit requirements
- Free trial webinars
- Referral bonuses (units for referring new users)
