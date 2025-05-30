import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Attendance Reports',
  description: 'Generate and export attendance reports',
};

export default function AttendanceReportsPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Attendance Reports</h1>
      <AttendanceReportsClient />
    </div>
  );
}

// Import the client component
import AttendanceReportsClient from './client';
