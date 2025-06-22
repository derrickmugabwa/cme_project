"use client";

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PaymentOverview from '@/app/dashboard/admin/payments/components/payment-overview';
import TransactionList from '@/app/dashboard/admin/payments/components/transaction-list';
import PaymentMethodStats from '@/app/dashboard/admin/payments/components/payment-method-stats';

export default function AdminPaymentsClient() {
  const [activeTab, setActiveTab] = useState('overview');
  
  return (
    <Tabs defaultValue="overview" onValueChange={setActiveTab} className="space-y-4">
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="transactions">Transactions</TabsTrigger>
        <TabsTrigger value="methods">Payment Methods</TabsTrigger>
      </TabsList>
      
      <TabsContent value="overview" className="space-y-4">
        <PaymentOverview />
      </TabsContent>
      
      <TabsContent value="transactions" className="space-y-4">
        <TransactionList />
      </TabsContent>

      <TabsContent value="methods" className="space-y-4">
        <PaymentMethodStats />
      </TabsContent>
    </Tabs>
  );
}
