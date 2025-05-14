export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          updated_at: string | null
          username: string | null
          full_name: string | null
          avatar_url: string | null
          role: 'student' | 'faculty' | 'admin'
          email: string
          created_at: string
        }
        Insert: {
          id: string
          updated_at?: string | null
          username?: string | null
          full_name?: string | null
          avatar_url?: string | null
          role?: 'student' | 'faculty' | 'admin'
          email: string
          created_at?: string
        }
        Update: {
          id?: string
          updated_at?: string | null
          username?: string | null
          full_name?: string | null
          avatar_url?: string | null
          role?: 'student' | 'faculty' | 'admin'
          email?: string
          created_at?: string
        }
      }
      courses: {
        Row: {
          id: string
          created_at: string
          title: string
          description: string | null
          faculty_id: string
          is_active: boolean
        }
        Insert: {
          id?: string
          created_at?: string
          title: string
          description?: string | null
          faculty_id: string
          is_active?: boolean
        }
        Update: {
          id?: string
          created_at?: string
          title?: string
          description?: string | null
          faculty_id?: string
          is_active?: boolean
        }
      }
      enrollments: {
        Row: {
          id: string
          created_at: string
          student_id: string
          course_id: string
          status: 'enrolled' | 'completed' | 'dropped'
        }
        Insert: {
          id?: string
          created_at?: string
          student_id: string
          course_id: string
          status?: 'enrolled' | 'completed' | 'dropped'
        }
        Update: {
          id?: string
          created_at?: string
          student_id?: string
          course_id?: string
          status?: 'enrolled' | 'completed' | 'dropped'
        }
      }
      attendance: {
        Row: {
          id: string
          created_at: string
          student_id: string
          course_id: string
          date: string
          status: 'present' | 'absent' | 'excused'
        }
        Insert: {
          id?: string
          created_at?: string
          student_id: string
          course_id: string
          date: string
          status?: 'present' | 'absent' | 'excused'
        }
        Update: {
          id?: string
          created_at?: string
          student_id?: string
          course_id?: string
          date?: string
          status?: 'present' | 'absent' | 'excused'
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_role: 'student' | 'faculty' | 'admin'
    }
  }
}
