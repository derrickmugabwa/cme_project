import { createClient } from '@/lib/server';

export async function getCertificateById(certificateId: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('certificates')
    .select(`
      *,
      profiles:user_id(*),
      sessions:session_id(*)
    `)
    .eq('id', certificateId)
    .single();
  
  if (error) {
    console.error('Error fetching certificate:', error);
    return null;
  }
  
  return data;
}

export async function getCertificateByNumber(certificateNumber: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('certificates')
    .select(`
      *,
      profiles:user_id(id, full_name, email),
      sessions:session_id(id, title, start_time, end_time)
    `)
    .eq('certificate_number', certificateNumber)
    .single();
  
  if (error) {
    console.error('Error fetching certificate:', error);
    return null;
  }
  
  return data;
}

export async function getUserCertificates(userId: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('certificates')
    .select(`
      *,
      sessions:session_id(id, title, start_time, end_time)
    `)
    .eq('user_id', userId)
    .order('issued_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching user certificates:', error);
    return [];
  }
  
  return data;
}

export async function recordCertificateDownload(certificateId: string) {
  const supabase = await createClient();
  
  const { error } = await supabase.rpc(
    'record_certificate_download',
    { p_certificate_id: certificateId }
  );
  
  if (error) {
    console.error('Error recording certificate download:', error);
    return false;
  }
  
  return true;
}

export async function generateCertificateForAttendance(attendanceId: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase.rpc(
    'generate_certificate',
    { p_attendance_id: attendanceId }
  );
  
  if (error) {
    console.error('Error generating certificate:', error);
    return null;
  }
  
  return data;
}

export async function verifyCertificate(certificateNumber: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase.rpc(
    'verify_certificate',
    { p_certificate_number: certificateNumber }
  );
  
  if (error) {
    console.error('Error verifying certificate:', error);
    return null;
  }
  
  // The function returns a table, so data is an array
  return data[0] || null;
}
