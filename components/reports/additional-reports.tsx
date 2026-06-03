"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

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

interface ReportProps {
  dateRange: DateRange | undefined;
  onSuccess?: () => void;
  onError?: (error: any) => void;
  toast: { toast: (props: ToastProps) => void };
}

// ─── Webinar Completion Report ────────────────────────────────────────────────
export async function generateWebinarCompletionReport({
  dateRange,
  onSuccess,
  onError,
  toast,
}: ReportProps) {
  const supabase = createClient();
  try {
    const fromDate = dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : '';
    const toDate   = dateRange?.to   ? format(dateRange.to,   'yyyy-MM-dd') : '';

    // Fetch raw attendance rows (no embedded joins — session_attendance has no FK in schema cache)
    const { data, error } = await supabase
      .from('session_attendance')
      .select('id, created_at, user_id, session_id, status')
      .gte('created_at', fromDate)
      .lte('created_at', toDate)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Batch-fetch profiles and sessions
    const userIds    = [...new Set((data || []).map((r: any) => r.user_id).filter(Boolean))];
    const sessionIds = [...new Set((data || []).map((r: any) => r.session_id).filter(Boolean))];

    const [{ data: profiles }, { data: sessions }] = await Promise.all([
      userIds.length > 0
        ? supabase.from('profiles').select('id, full_name, email, institution, professional_cadre').in('id', userIds)
        : Promise.resolve({ data: [] }),
      sessionIds.length > 0
        ? supabase.from('sessions').select('id, title, start_time, end_time').in('id', sessionIds)
        : Promise.resolve({ data: [] }),
    ]);

    const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));
    const sessionMap = new Map((sessions || []).map((s: any) => [s.id, s]));

    const worksheetData = (data || []).map((row: any, i: number) => {
      const profile = profileMap.get(row.user_id);
      const session = sessionMap.get(row.session_id);
      return {
        '#':                  i + 1,
        'Participant Name':   profile?.full_name || 'N/A',
        'Email':              profile?.email || 'N/A',
        'Institution':        profile?.institution || 'N/A',
        'Profession':         profile?.professional_cadre || 'N/A',
        'Webinar Title':      session?.title || 'N/A',
        'Webinar Date':       session?.start_time ? format(new Date(session.start_time), 'yyyy-MM-dd') : 'N/A',
        'Start Time':         session?.start_time ? format(new Date(session.start_time), 'HH:mm') : 'N/A',
        'End Time':           session?.end_time   ? format(new Date(session.end_time),   'HH:mm') : 'N/A',
        'Attendance Status':  row.status || 'N/A',
        'Completed':          row.status === 'approved' ? 'Yes' : 'No',
        'Record Date':        row.created_at ? format(new Date(row.created_at), 'yyyy-MM-dd HH:mm') : 'N/A',
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    autoSize(worksheet, worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Webinar Completion');

    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    saveAs(
      new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
      `Webinar_Completion_Report_${format(new Date(), 'yyyy-MM-dd')}.xlsx`
    );

    toast.toast({ title: 'Report Generated', description: 'Webinar Completion report downloaded successfully.' });
    if (onSuccess) onSuccess();
  } catch (error) {
    console.error('Error generating webinar completion report:', error);
    toast.toast({ title: 'Error', description: 'Failed to generate report. Please try again.', variant: 'destructive' });
    if (onError) onError(error);
  }
}

// ─── Certificate Issuance Report ──────────────────────────────────────────────
export async function generateCertificateIssuanceReport({
  dateRange,
  onSuccess,
  onError,
  toast,
}: ReportProps) {
  const supabase = createClient();
  try {
    const fromDate = dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : '';
    const toDate   = dateRange?.to   ? format(dateRange.to,   'yyyy-MM-dd') : '';

    const { data, error } = await supabase
      .from('certificates')
      .select(`
        id,
        certificate_number,
        issued_at,
        user_id,
        session_id,
        profiles:user_id(full_name, email, registration_number, id_number, institution, professional_cadre),
        sessions:session_id(title, start_time)
      `)
      .gte('issued_at', fromDate)
      .lte('issued_at', toDate)
      .order('issued_at', { ascending: false });

    if (error) throw error;

    const worksheetData = (data || []).map((row: any, i: number) => ({
      '#':                    i + 1,
      'Certificate Number':   row.certificate_number || 'N/A',
      'Issued Date':          row.issued_at ? format(new Date(row.issued_at), 'yyyy-MM-dd HH:mm') : 'N/A',
      'Participant Name':     row.profiles?.full_name || 'N/A',
      'Email':                row.profiles?.email || 'N/A',
      'Registration Number':  row.profiles?.registration_number || 'N/A',
      'National ID Number':   row.profiles?.id_number || 'N/A',
      'Institution':          row.profiles?.institution || 'N/A',
      'Profession':           row.profiles?.professional_cadre || 'N/A',
      'Webinar Title':        row.sessions?.title || 'N/A',
      'Webinar Date':         row.sessions?.start_time ? format(new Date(row.sessions.start_time), 'yyyy-MM-dd') : 'N/A',
    }));

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    autoSize(worksheet, worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Certificate Issuance');

    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    saveAs(
      new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
      `Certificate_Issuance_Report_${format(new Date(), 'yyyy-MM-dd')}.xlsx`
    );

    toast.toast({ title: 'Report Generated', description: 'Certificate Issuance report downloaded successfully.' });
    if (onSuccess) onSuccess();
  } catch (error) {
    console.error('Error generating certificate issuance report:', error);
    toast.toast({ title: 'Error', description: 'Failed to generate report. Please try again.', variant: 'destructive' });
    if (onError) onError(error);
  }
}

// ─── Revenue Analysis Report ─────────────────────────────────────────────────
export async function generateRevenueAnalysisReport({
  dateRange,
  onSuccess,
  onError,
  toast,
}: ReportProps) {
  const supabase = createClient();
  try {
    const fromDate = dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : '';
    const toDate   = dateRange?.to   ? format(dateRange.to,   'yyyy-MM-dd') : '';

    const { data, error } = await supabase
      .from('payment_transactions')
      .select('*')
      .gte('created_at', fromDate)
      .lte('created_at', toDate)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Fetch profiles separately for all unique user_ids
    const userIds = [...new Set((data || []).map((r: any) => r.user_id).filter(Boolean))];
    const { data: profiles } = userIds.length > 0
      ? await supabase.from('profiles').select('id, full_name, email').in('id', userIds)
      : { data: [] };

    const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));

    const worksheetData = (data || []).map((row: any, i: number) => {
      const profile = profileMap.get(row.user_id);
      return {
        '#':                  i + 1,
        'Transaction Date':   row.created_at ? format(new Date(row.created_at), 'yyyy-MM-dd HH:mm') : 'N/A',
        'Participant Name':   profile?.full_name || 'N/A',
        'Email':              profile?.email || 'N/A',
        'Amount (KES)':       row.amount ?? 0,
        'Units Purchased':    row.units_purchased ?? row.units ?? 'N/A',
        'Status':             row.status || 'N/A',
        'Payment Provider':   row.provider || row.payment_method || 'N/A',
        'Provider Reference': row.provider_reference || row.mpesa_receipt || 'N/A',
        'Transaction ID':     row.id,
      };
    });

    // Summary sheet
    const completed = (data || []).filter((r: any) => r.status === 'completed');
    const totalRevenue = completed.reduce((sum: number, r: any) => sum + (r.amount ?? 0), 0);
    const summaryData = [
      { 'Metric': 'Total Transactions',    'Value': (data || []).length },
      { 'Metric': 'Completed Payments',   'Value': completed.length },
      { 'Metric': 'Total Revenue (KES)',   'Value': totalRevenue },
      { 'Metric': 'Average Payment (KES)', 'Value': completed.length ? (totalRevenue / completed.length).toFixed(2) : 0 },
      { 'Metric': 'Period',               'Value': `${fromDate} to ${toDate}` },
    ];

    const workbook = XLSX.utils.book_new();
    const detailSheet = XLSX.utils.json_to_sheet(worksheetData);
    autoSize(detailSheet, worksheetData);
    XLSX.utils.book_append_sheet(workbook, detailSheet, 'Transactions');

    const summarySheet = XLSX.utils.json_to_sheet(summaryData);
    autoSize(summarySheet, summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    saveAs(
      new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
      `Revenue_Analysis_Report_${format(new Date(), 'yyyy-MM-dd')}.xlsx`
    );

    toast.toast({ title: 'Report Generated', description: 'Revenue Analysis report downloaded successfully.' });
    if (onSuccess) onSuccess();
  } catch (error) {
    console.error('Error generating revenue analysis report:', error);
    toast.toast({ title: 'Error', description: 'Failed to generate report. Please try again.', variant: 'destructive' });
    if (onError) onError(error);
  }
}

// ─── Activity Timeline Report ─────────────────────────────────────────────────
export async function generateActivityTimelineReport({
  dateRange,
  onSuccess,
  onError,
  toast,
}: ReportProps) {
  const supabase = createClient();
  try {
    const fromDate = dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : '';
    const toDate   = dateRange?.to   ? format(dateRange.to,   'yyyy-MM-dd') : '';

    // Fetch raw rows for all three tables (no embedded joins on session_attendance)
    const [enrollRes, attendRes, certRes] = await Promise.all([
      supabase
        .from('session_enrollments')
        .select('id, created_at, user_id, session_id, status, profiles:user_id(full_name, email), sessions:session_id(title)')
        .gte('created_at', fromDate)
        .lte('created_at', toDate),
      supabase
        .from('session_attendance')
        .select('id, created_at, user_id, session_id, status')
        .gte('created_at', fromDate)
        .lte('created_at', toDate),
      supabase
        .from('certificates')
        .select('id, issued_at, user_id, session_id, certificate_number, profiles:user_id(full_name, email), sessions:session_id(title)')
        .gte('issued_at', fromDate)
        .lte('issued_at', toDate),
    ]);

    // Manually resolve profiles + sessions for session_attendance rows
    const attendRows = attendRes.data || [];
    const attUserIds    = [...new Set(attendRows.map((r: any) => r.user_id).filter(Boolean))];
    const attSessionIds = [...new Set(attendRows.map((r: any) => r.session_id).filter(Boolean))];

    const [{ data: attProfiles }, { data: attSessions }] = await Promise.all([
      attUserIds.length > 0
        ? supabase.from('profiles').select('id, full_name, email').in('id', attUserIds)
        : Promise.resolve({ data: [] }),
      attSessionIds.length > 0
        ? supabase.from('sessions').select('id, title').in('id', attSessionIds)
        : Promise.resolve({ data: [] }),
    ]);

    const attProfileMap = new Map((attProfiles || []).map((p: any) => [p.id, p]));
    const attSessionMap = new Map((attSessions || []).map((s: any) => [s.id, s]));

    // Combine all events into a unified timeline
    const events: any[] = [
      ...(enrollRes.data || []).map((r: any) => ({
        date: r.created_at,
        event_type: 'Enrollment',
        name: (r.profiles as any)?.full_name || 'N/A',
        email: (r.profiles as any)?.email || 'N/A',
        webinar: (r.sessions as any)?.title || 'N/A',
        detail: `Status: ${r.status || 'N/A'}`,
        reference: r.id,
      })),
      ...attendRows.map((r: any) => ({
        date: r.created_at,
        event_type: 'Attendance',
        name: attProfileMap.get(r.user_id)?.full_name || 'N/A',
        email: attProfileMap.get(r.user_id)?.email || 'N/A',
        webinar: attSessionMap.get(r.session_id)?.title || 'N/A',
        detail: `Status: ${r.status || 'N/A'}`,
        reference: r.id,
      })),
      ...(certRes.data || []).map((r: any) => ({
        date: r.issued_at,
        event_type: 'Certificate Issued',
        name: (r.profiles as any)?.full_name || 'N/A',
        email: (r.profiles as any)?.email || 'N/A',
        webinar: (r.sessions as any)?.title || 'N/A',
        detail: `Cert #: ${r.certificate_number || 'N/A'}`,
        reference: r.id,
      })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const worksheetData = events.map((e, i) => ({
      '#':           i + 1,
      'Date & Time': e.date ? format(new Date(e.date), 'yyyy-MM-dd HH:mm') : 'N/A',
      'Event Type':  e.event_type,
      'Participant': e.name,
      'Email':       e.email,
      'Webinar':     e.webinar,
      'Detail':      e.detail,
      'Reference':   e.reference,
    }));

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    autoSize(worksheet, worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Activity Timeline');

    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    saveAs(
      new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
      `Activity_Timeline_Report_${format(new Date(), 'yyyy-MM-dd')}.xlsx`
    );

    toast.toast({ title: 'Report Generated', description: 'Activity Timeline report downloaded successfully.' });
    if (onSuccess) onSuccess();
  } catch (error) {
    console.error('Error generating activity timeline report:', error);
    toast.toast({ title: 'Error', description: 'Failed to generate report. Please try again.', variant: 'destructive' });
    if (onError) onError(error);
  }
}

// ─── Helper: auto-size columns ────────────────────────────────────────────────
function autoSize(worksheet: XLSX.WorkSheet, data: Record<string, any>[]) {
  if (!data.length) return;
  const colWidths = data.reduce((acc: Record<string, number>, row) => {
    Object.keys(row).forEach(key => {
      acc[key] = Math.max(acc[key] || key.length, String(row[key]).length);
    });
    return acc;
  }, {});
  worksheet['!cols'] = Object.values(colWidths).map(w => ({ wch: Math.min(w + 2, 60) }));
}
