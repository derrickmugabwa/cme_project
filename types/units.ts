export interface UserUnits {
  id: string;
  user_id: string;
  units: number;
  created_at: string;
  updated_at: string;
}

export interface UnitTransaction {
  id: string;
  user_id: string;
  amount: number;
  transaction_type: 'topup' | 'enrollment' | 'refund';
  session_id?: string;
  notes?: string;
  created_at: string;
  created_by?: string;
  profiles?: {
    full_name: string;
  };
}

export interface SessionUnitRequirement {
  id: string;
  session_id: string;
  units_required: number;
  created_at: string;
  updated_at: string;
}

export interface SessionEnrollment {
  id: string;
  user_id: string;
  session_id: string;
  status: 'enrolled';
  units_spent: number;
  created_at: string;
}

export interface EnrollmentStatus {
  enrolled: boolean;
  enrollment: SessionEnrollment | null;
  unitRequirement: number;
  userUnits: number;
}
