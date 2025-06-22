"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/client';
import { LoadingSection } from '@/components/ui/loading-spinner';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';

type PaymentMethodStat = {
  method: string;
  total_transactions: number;
  total_amount: number;
  completed_transactions: number;
  completed_amount: number;
  pending_transactions: number;
  pending_amount: number;
  failed_transactions: number;
  failed_amount: number;
  success_rate: number;
};

type MonthlyMethodStat = {
  month: string;
  mpesa?: number;
  paystack?: number;
  pesapal?: number;
};

export default function PaymentMethodStats() {
  const [loading, setLoading] = useState(true);
  const [methodStats, setMethodStats] = useState<PaymentMethodStat[]>([]);
  const [monthlyStats, setMonthlyStats] = useState<MonthlyMethodStat[]>([]);
  const [activeMethod, setActiveMethod] = useState('all');
  const supabase = createClient();

  useEffect(() => {
    fetchPaymentMethodStats();
  }, []);

  async function fetchPaymentMethodStats() {
    try {
      setLoading(true);
      
      // Fetch payment method statistics
      const { data: methodsData, error: methodsError } = await supabase.rpc('get_payment_method_stats');
      
      if (methodsError) {
        console.error('Error fetching payment method stats:', methodsError);
        return;
      }
      
      // Fetch monthly statistics for the last 6 months
      const { data: monthlyData, error: monthlyError } = await supabase.rpc('get_monthly_payment_method_stats', {
        months_back: 6
      });
      
      if (monthlyError) {
        console.error('Error fetching monthly stats:', monthlyError);
        return;
      }
      
      setMethodStats(methodsData || []);
      
      // Format monthly data for chart
      const formattedMonthlyData = monthlyData.map((item: any) => {
        const monthName = new Date(item.year, item.month - 1, 1).toLocaleString('default', { month: 'short' });
        return {
          month: `${monthName} ${item.year}`,
          [item.payment_method]: parseFloat(item.total_amount)
        };
      });
      
      // Group by month
      const groupedByMonth: Record<string, MonthlyMethodStat> = {};
      formattedMonthlyData.forEach((item: any) => {
        const month = item.month;
        if (!groupedByMonth[month]) {
          groupedByMonth[month] = { month };
        }
        
        // Add the payment method amount
        Object.keys(item).forEach(key => {
          if (key !== 'month') {
            groupedByMonth[month][key] = item[key];
          }
        });
      });
      
      // Convert back to array and sort by date
      const sortedMonthlyData = Object.values(groupedByMonth).sort((a, b) => {
        const dateA = new Date(a.month);
        const dateB = new Date(b.month);
        return dateA.getTime() - dateB.getTime();
      });
      
      setMonthlyStats(sortedMonthlyData);
    } catch (error) {
      console.error('Error in payment method stats:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <LoadingSection />;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Payment Method Performance</CardTitle>
          <CardDescription>Compare performance across different payment methods</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="volume" className="space-y-4">
            <TabsList>
              <TabsTrigger value="volume">Transaction Volume</TabsTrigger>
              <TabsTrigger value="amount">Transaction Amount</TabsTrigger>
              <TabsTrigger value="success">Success Rate</TabsTrigger>
            </TabsList>
            
            <TabsContent value="volume" className="space-y-4">
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={methodStats}
                    margin={{
                      top: 5,
                      right: 30,
                      left: 20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="method" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="total_transactions" name="Total" fill="#8884d8" />
                    <Bar dataKey="completed_transactions" name="Completed" fill="#82ca9d" />
                    <Bar dataKey="pending_transactions" name="Pending" fill="#ffc658" />
                    <Bar dataKey="failed_transactions" name="Failed" fill="#ff8042" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </TabsContent>
            
            <TabsContent value="amount" className="space-y-4">
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={methodStats}
                    margin={{
                      top: 5,
                      right: 30,
                      left: 20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="method" />
                    <YAxis />
                    <Tooltip formatter={(value) => `KES ${value}`} />
                    <Legend />
                    <Bar dataKey="total_amount" name="Total" fill="#8884d8" />
                    <Bar dataKey="completed_amount" name="Completed" fill="#82ca9d" />
                    <Bar dataKey="pending_amount" name="Pending" fill="#ffc658" />
                    <Bar dataKey="failed_amount" name="Failed" fill="#ff8042" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </TabsContent>
            
            <TabsContent value="success" className="space-y-4">
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={methodStats}
                    margin={{
                      top: 5,
                      right: 30,
                      left: 20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="method" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip formatter={(value) => `${value}%`} />
                    <Legend />
                    <Bar dataKey="success_rate" name="Success Rate" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Monthly Trends</CardTitle>
          <CardDescription>Payment method usage over time</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" onValueChange={setActiveMethod} className="space-y-4">
            <TabsList>
              <TabsTrigger value="all">All Methods</TabsTrigger>
              <TabsTrigger value="mpesa">M-Pesa</TabsTrigger>
              <TabsTrigger value="paystack">Paystack</TabsTrigger>
              <TabsTrigger value="pesapal">PesaPal</TabsTrigger>
            </TabsList>
            
            <TabsContent value="all" className="space-y-4">
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={monthlyStats}
                    margin={{
                      top: 5,
                      right: 30,
                      left: 20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => `KES ${value}`} />
                    <Legend />
                    <Line type="monotone" dataKey="mpesa" name="M-Pesa" stroke="#8884d8" activeDot={{ r: 8 }} />
                    <Line type="monotone" dataKey="paystack" name="Paystack" stroke="#82ca9d" activeDot={{ r: 8 }} />
                    <Line type="monotone" dataKey="pesapal" name="PesaPal" stroke="#ffc658" activeDot={{ r: 8 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </TabsContent>
            
            <TabsContent value="mpesa" className="space-y-4">
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={monthlyStats}
                    margin={{
                      top: 5,
                      right: 30,
                      left: 20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => `KES ${value}`} />
                    <Legend />
                    <Line type="monotone" dataKey="mpesa" name="M-Pesa" stroke="#8884d8" activeDot={{ r: 8 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </TabsContent>
            
            <TabsContent value="paystack" className="space-y-4">
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={monthlyStats}
                    margin={{
                      top: 5,
                      right: 30,
                      left: 20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => `KES ${value}`} />
                    <Legend />
                    <Line type="monotone" dataKey="paystack" name="Paystack" stroke="#82ca9d" activeDot={{ r: 8 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </TabsContent>
            
            <TabsContent value="pesapal" className="space-y-4">
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={monthlyStats}
                    margin={{
                      top: 5,
                      right: 30,
                      left: 20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => `KES ${value}`} />
                    <Legend />
                    <Line type="monotone" dataKey="pesapal" name="PesaPal" stroke="#ffc658" activeDot={{ r: 8 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
