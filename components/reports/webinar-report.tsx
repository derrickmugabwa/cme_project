"use client";

import { createClient } from "@/lib/client";
import { format } from "date-fns";
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { DateRange } from "react-day-picker";
import { type ToastActionElement } from "@/components/ui/toast";

// Define types for the report data
interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone_number: string;
  institution: string;
  country: string;
  professional_cadre: string;
  role: string;
}

interface WebinarAttendee {
  participant_id: string;
  full_name: string;
  email: string;
  phone_number: string;
  organization: string;
  country: string;
  profession: string;
  webinar_title: string;
  registration_date: string;
  payment_status: string;
  amount_paid: number;
  mode_of_payment: string;
  attended: boolean;
}

type ToastProps = {
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
  action?: ToastActionElement;
};

interface WebinarReportGeneratorProps {
  dateRange: DateRange | undefined;
  onSuccess?: () => void;
  onError?: (error: any) => void;
  toast: {
    toast: (props: ToastProps) => void;
  };
}

// This is a utility function, not a React component
export async function generateWebinarReport({
  dateRange,
  onSuccess,
  onError,
  toast
}: WebinarReportGeneratorProps) {
  const supabase = createClient();
  
  try {
    // Format date range for query
    const fromDate = dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : '';
    const toDate = dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : '';
    
    // Query webinar enrollments with all required fields
    const { data, error } = await supabase
      .from('session_enrollments')
      .select(`
        id,
        created_at,
        user_id,
        session_id,
        status,
        units_spent,
        profiles:user_id(id, full_name, email, phone_number, institution, country, professional_cadre, role),
        sessions:session_id(id, title)
      `)
      .gte('created_at', fromDate)
      .lte('created_at', toDate)
      .order('created_at', { ascending: false });
      
    if (error) {
      throw error;
    }
    
    // Get all attendance records in a single query for better performance
    const { data: allAttendanceData, error: attendanceError } = await supabase
      .from('session_attendance')
      .select('*');
      
    if (attendanceError) {
      console.error('Error fetching attendance data:', attendanceError);
      throw attendanceError;
    }
    
    // Create a map of attendance records for quick lookup
    const attendanceMap = new Map();
    allAttendanceData?.forEach(record => {
      const key = `${record.user_id}-${record.session_id}`;
      attendanceMap.set(key, record);
    });
    
    // Attach attendance data to each enrollment
    const enrollmentsWithAttendance = data?.map(enrollment => {
      const key = `${enrollment.user_id}-${enrollment.session_id}`;
      const attendanceRecord = attendanceMap.get(key);
      
      return {
        ...enrollment,
        attendance: attendanceRecord
      };
    }) || [];
    
    // No need to wait since we're not using promises anymore
    
    // Process data for Excel
    const worksheetData = enrollmentsWithAttendance.map((enrollment: any, index: number) => ({
      'Participant ID': `P${(index + 1).toString().padStart(3, '0')}`,
      'Full Name': enrollment.profiles?.full_name || 'N/A',
      'Email Address': enrollment.profiles?.email || 'N/A',
      'Phone Number': enrollment.profiles?.phone_number || 'N/A',
      'Organization': enrollment.profiles?.institution || 'N/A',
      'Country': enrollment.profiles?.country || 'N/A',
      'Profession': enrollment.profiles?.professional_cadre || enrollment.profiles?.role || 'N/A',
      'Webinar Title': enrollment.sessions?.title || 'N/A',
      'Registration Date': format(new Date(enrollment.created_at), 'yyyy-MM-dd HH:mm:ss'),
      'Payment Status': 'N/A', // Payment status not available in current schema
      'Amount Paid': enrollment.units_spent || 0, // Using units_spent as a placeholder
      'Mode of Payment': 'Units', // Default payment method
      'Attended': enrollment.attendance !== null && enrollment.attendance !== undefined ? 'Yes' : 'No' // Using session_attendance table to determine attendance
    })) || [];
    
    // Create workbook and worksheet
    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Webinar Attendees");
    
    // Auto-size columns
    const colWidths = worksheetData.reduce((acc: any, row: any) => {
      Object.keys(row).forEach(key => {
        const value = String(row[key]);
        acc[key] = Math.max(acc[key] || 0, value.length);
      });
      return acc;
    }, {});
    
    worksheet['!cols'] = Object.keys(colWidths).map(key => ({ wch: Math.min(Math.max(colWidths[key], key.length) + 2, 50) }));
    
    // Generate Excel file
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const fileData = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    // Save file
    saveAs(fileData, `Webinar_Attendees_Report_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    
    toast.toast({
      title: "Report Generated",
      description: "Your webinar attendees report has been generated successfully.",
    });
    
    if (onSuccess) onSuccess();
  } catch (error) {
    console.error('Error generating report:', error);
    toast.toast({
      title: "Error",
      description: "Failed to generate report. Please try again.",
      variant: "destructive",
    });
    
    if (onError) onError(error);
  }
}
