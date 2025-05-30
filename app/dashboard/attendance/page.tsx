import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Attendance Management',
  description: 'Manage webinar attendance records',
};

export default function AttendancePage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Attendance Management</h1>
      <AttendanceClient />
    </div>
  );
}

// Import the client component
import AttendanceClient from './client';
