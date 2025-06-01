import { Metadata } from 'next';
import UserUnitsClient from './client';

export const metadata: Metadata = {
  title: 'Units Wallet',
  description: 'Manage your units for webinar enrollments',
};

export default function UnitsPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Units Wallet</h1>
        <p className="text-muted-foreground">
          View your units balance and transaction history
        </p>
      </div>
      
      <UserUnitsClient />
    </div>
  );
}
