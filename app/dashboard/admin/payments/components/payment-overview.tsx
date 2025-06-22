"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from '@/lib/client';
import { LoadingSection } from '@/components/ui/loading-spinner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

type PaymentStats = {
  totalTransactions: number;
  totalAmount: number;
  completedTransactions: number;
  completedAmount: number;
  pendingTransactions: number;
  pendingAmount: number;
  failedTransactions: number;
  failedAmount: number;
};

type PaymentMethodStat = {
  method: string;
  count: number;
  amount: number;
};

type DailyStats = {
  date: string;
  amount: number;
  transactions: number;
};

export default function PaymentOverview() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodStat[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const supabase = createClient();
  
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28'];

  useEffect(() => {
    async function fetchPaymentStats() {
      try {
        setLoading(true);
        
        // Fetch overall payment statistics
        const { data: statsData, error: statsError } = await supabase.rpc('get_payment_stats');
        
        if (statsError) {
          console.error('Error fetching payment stats:', statsError);
          return;
        }
        
        // Fetch payment method statistics using a custom SQL query
        const { data: methodsData, error: methodsError } = await supabase.rpc('get_payment_method_summary');
          
        if (methodsError) {
          console.error('Error fetching payment methods:', methodsError);
          return;
        }
        
        // Fetch daily statistics for the last 7 days
        const { data: dailyData, error: dailyError } = await supabase.rpc('get_daily_payment_stats', {
          days_back: 7
        });
        
        if (dailyError) {
          console.error('Error fetching daily stats:', dailyError);
          return;
        }
        
        setStats(statsData);
        
        const formattedMethodsData = methodsData.map((item: any) => ({
          method: item.payment_method,
          count: parseInt(item.count),
          amount: parseFloat(item.sum)
        }));
        
        setPaymentMethods(formattedMethodsData);
        
        const formattedDailyData = dailyData.map((item: any) => ({
          date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          amount: parseFloat(item.total_amount),
          transactions: parseInt(item.transaction_count)
        }));
        
        setDailyStats(formattedDailyData);
      } catch (error) {
        console.error('Error in payment stats:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchPaymentStats();
  }, [supabase]);
  
  if (loading) {
    return <LoadingSection />;
  }
  
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalTransactions || 0}</div>
            <p className="text-xs text-muted-foreground">
              {new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'KES'
              }).format(stats?.totalAmount || 0)}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.completedTransactions || 0}</div>
            <p className="text-xs text-muted-foreground">
              {new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'KES'
              }).format(stats?.completedAmount || 0)}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.pendingTransactions || 0}</div>
            <p className="text-xs text-muted-foreground">
              {new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'KES'
              }).format(stats?.pendingAmount || 0)}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.failedTransactions || 0}</div>
            <p className="text-xs text-muted-foreground">
              {new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'KES'
              }).format(stats?.failedAmount || 0)}
            </p>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Daily Transactions</CardTitle>
            <CardDescription>Transaction volume over the last 7 days</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={dailyStats}
                margin={{
                  top: 5,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="transactions" fill="#8884d8" name="Transactions" />
                <Bar dataKey="amount" fill="#82ca9d" name="Amount (KES)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Payment Methods</CardTitle>
            <CardDescription>Distribution by payment method</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={paymentMethods}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                  nameKey="method"
                  label={({ method, percent }) => `${method}: ${(percent * 100).toFixed(0)}%`}
                >
                  {paymentMethods.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
