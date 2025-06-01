import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'My Attendance History',
  description: 'View your webinar attendance history',
};

export default function MyAttendancePage() {
  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">My Attendance History</h1>
      </div>
      <UserAttendanceClient />
    </div>
  );
}

// Import the client component
import UserAttendanceClient from './client';
