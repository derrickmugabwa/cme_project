import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'My Attendance History',
  description: 'View your webinar attendance history',
};

export default function AttendanceHistoryPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">My Attendance History</h1>
      <AttendanceHistoryClient />
    </div>
  );
}

// Import the client component
import AttendanceHistoryClient from './client';
