"use client";

import { createClient } from "@/lib/client";
import { format } from "date-fns";
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { DateRange } from "react-day-picker";
import { type ToastActionElement } from "@/components/ui/toast";

type ToastProps = {
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
  action?: ToastActionElement;
};

interface EnrollmentReportGeneratorProps {
  dateRange: DateRange | undefined;
  onSuccess?: () => void;
  onError?: (error: any) => void;
  toast: {
    toast: (props: ToastProps) => void;
  };
}

// This is a utility function, not a React component
export async function generateEnrollmentReport({
  dateRange,
  onSuccess,
  onError,
  toast
}: EnrollmentReportGeneratorProps) {
  const supabase = createClient();
  
  try {
    // Format date range for query
    const fromDate = dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : '';
    const toDate = dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : '';
    
    // Query session enrollments data
    const { data: enrollments, error } = await supabase
      .from('session_enrollments')
      .select(`
        id,
        created_at,
        user_id,
        session_id,
        status,
        units_spent,
        profiles:user_id(id, full_name, email)
      `)
      .gte('created_at', fromDate)
      .lte('created_at', toDate)
      .order('created_at', { ascending: false });
      
    if (error) {
      throw error;
    }
    
    // Process data for Excel
    const worksheetData = enrollments?.map(enrollment => ({
      'Enrollment ID': enrollment.id,
      'Enrollment Date': format(new Date(enrollment.created_at), 'yyyy-MM-dd'),
      'User Name': enrollment.profiles?.full_name || 'N/A',
      'User Email': enrollment.profiles?.email || 'N/A',
      'Status': enrollment.status || 'N/A',
      'Units Spent': enrollment.units_spent || 0,
      'Session ID': enrollment.session_id || 'N/A'
    })) || [];
    
    // Create workbook and worksheet
    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Enrollments");
    
    // Generate Excel file
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const fileData = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    // Save file
    saveAs(fileData, `Enrollment_Report_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    
    toast.toast({
      title: "Report Generated",
      description: "Your enrollment report has been generated successfully.",
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
