import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Attendance Management',
  description: 'Manage webinar attendance records',
};

export default function AttendancePage() {
  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Webinar Attendance</h1>
      </div>
      <AttendanceClient />
    </div>
  );
}

// Import the client component
import AttendanceClient from './client';
