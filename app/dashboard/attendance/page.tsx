import { Metadata } from 'next';
// Import the enhanced client component at the top
import EnhancedAttendanceClient from './enhanced-client';

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
      <EnhancedAttendanceClient />
    </div>
  );
}
