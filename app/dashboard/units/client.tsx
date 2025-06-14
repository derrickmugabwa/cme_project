"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { format } from 'date-fns';
import { UnitTransaction } from '@/types/units';
import { Plus, Wallet, TrendingUp, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import Image from 'next/image';
import { useToast } from "@/components/ui/use-toast";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

export default function UserUnitsClient() {
  const { toast } = useToast();

  // All useState hooks must be declared before any useEffect hooks
  const [units, setUnits] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<UnitTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Sample data for usage chart
  const [usageData, setUsageData] = useState([
    { name: 'Available', value: 25, color: '#4ade80' },
    { name: 'Used', value: 15, color: '#f87171' },
  ]);
  
  // Track units added this month for trend display
  const [addedThisMonth, setAddedThisMonth] = useState(0);
  // State for top-up form
  const [topupAmount, setTopupAmount] = useState<number>(10);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'mpesa' | 'paystack'>('mpesa');
  const [mobileNumber, setMobileNumber] = useState('');

  useEffect(() => {
    const fetchUnits = async () => {
      try {
        const response = await fetch('/api/units');
        if (!response.ok) {
          throw new Error('Failed to fetch units');
        }
        const data = await response.json();
        setUnits(data.units);
        
        // Calculate total units purchased and used based on transactions
        const fetchedUnits = data.units || 0;
        
        // We'll calculate this properly when we have the transactions
        setUsageData([
          { name: 'Available', value: fetchedUnits, color: '#4ade80' },
          { name: 'Used', value: 0, color: '#f87171' }, // Will update this after fetching transactions
        ]);
      } catch (err) {
        console.error('Error fetching units:', err);
        setError('Failed to load units balance');
      }
    };

    const fetchTransactions = async () => {
      try {
        const response = await fetch('/api/units/transactions');
        if (!response.ok) {
          throw new Error('Failed to fetch transactions');
        }
        const data = await response.json();
        const transactionList = data.transactions || [];
        setTransactions(transactionList);
        
        // Calculate used units based on transaction history
        let totalUsed = 0;
        let totalAdded = 0;
        const currentMonth = new Date().getMonth();
        let addedThisMonth = 0;
        
        transactionList.forEach((transaction: UnitTransaction) => {
          if (transaction.transaction_type === 'enrollment') {
            // Negative amounts represent units spent
            totalUsed += Math.abs(transaction.amount);
          } else if (transaction.transaction_type === 'topup') {
            // Positive amounts represent units added
            totalAdded += transaction.amount;
            
            // Check if transaction is from current month
            const transactionDate = new Date(transaction.created_at);
            if (transactionDate.getMonth() === currentMonth) {
              addedThisMonth += transaction.amount;
            }
          }
        });
        
        // Calculate total units (current balance + used)
        const totalUnits = (units || 0) + totalUsed;
        
        // Update chart data with actual usage statistics
        setUsageData([
          { name: 'Available', value: units || 0, color: '#4ade80' },
          { name: 'Used', value: totalUsed, color: '#f87171' },
        ]);
        
        // Update the monthly trend state
        setAddedThisMonth(addedThisMonth);
        
      } catch (err) {
        console.error('Error fetching transactions:', err);
        setError('Failed to load transaction history');
      } finally {
        setLoading(false);
      }
    };

    fetchUnits();
    fetchTransactions();
  }, []);

  const getTransactionTypeLabel = (type: string) => {
    switch (type) {
      case 'topup':
        return 'Top-up';
      case 'enrollment':
        return 'Enrollment';
      case 'refund':
        return 'Refund';
      default:
        return type;
    }
  };

  const getTransactionBadgeColor = (type: string) => {
    switch (type) {
      case 'topup':
        return 'bg-green-100 text-green-800 hover:bg-green-100';
      case 'enrollment':
        return 'bg-blue-100 text-blue-800 hover:bg-blue-100';
      case 'refund':
        return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100';
      default:
        return 'bg-gray-100 text-gray-800 hover:bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Units Dashboard</CardTitle>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-12 w-32 mb-4" />
              <Skeleton className="h-[150px] w-full" />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Top Up Units</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-[140px] w-full" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-500">
            {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Handle top-up submission
  const handleTopup = async (method: 'mpesa' | 'paystack') => {
    if (topupAmount < 5) {
      toast({
        title: "Invalid amount",
        description: "Minimum top-up amount is 5 units",
        variant: "destructive",
      });
      return;
    }

    // For M-Pesa, validate mobile number
    if (method === 'mpesa' && !mobileNumber) {
      toast({
        title: "Missing mobile number",
        description: "Please enter your M-Pesa mobile number",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    // Simulate payment processing
    setTimeout(() => {
      // Add success logic here
      const paymentDetails = method === 'mpesa' 
        ? `Added ${topupAmount} units to your account via M-Pesa. Payment request sent to ${mobileNumber}`
        : `Added ${topupAmount} units to your account via Paystack`;
      
      toast({
        title: "Top-up successful",
        description: paymentDetails,
      });
      setIsProcessing(false);
      // Refresh units data after successful payment
      setLoading(true);
      // In a real implementation, we would call an API to fetch updated units
      // For now, just simulate a refresh by updating the units value
      setTimeout(() => {
        setUnits((prev) => (prev || 0) + topupAmount);
        
        // Add a new transaction to the list
        const newTransaction: UnitTransaction = {
          id: `tx-${Date.now()}`,
          user_id: 'current-user', // In a real app, this would be the actual user ID
          amount: topupAmount,
          transaction_type: 'topup',
          notes: method === 'mpesa' ? `Top-up via M-Pesa (${mobileNumber})` : 'Top-up via Paystack',
          created_at: new Date().toISOString()
        };
        
        setTransactions(prev => [newTransaction, ...prev]);
        setLoading(false);
      }, 500);
      
      // Reset mobile number after successful payment
      if (method === 'mpesa') {
        setMobileNumber('');
      }
    }, 2000);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <CardTitle>Units Dashboard</CardTitle>
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center">
                  <Wallet className="h-8 w-8 mr-3 text-primary" />
                  <div>
                    <div className="text-3xl font-bold">{units} Units</div>
                    <div className="text-sm text-muted-foreground">Available for enrollment</div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2 mt-4">
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-[#4ade80] mr-1"></div>
                    <span className="text-sm">Available</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-[#f87171] mr-1"></div>
                    <span className="text-sm">Used</span>
                  </div>
                </div>
              </div>
              
              <div className="h-[150px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={usageData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={60}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {usageData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value, name) => [`${value} Units`, name]}
                      contentStyle={{ borderRadius: '0.5rem', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t">
              <h4 className="text-sm font-medium mb-2">Recent Transactions</h4>
              <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                {transactions.slice(0, 5).map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between text-sm p-2 rounded-md bg-muted/40">
                    <div className="flex items-center">
                      {transaction.transaction_type === 'topup' ? (
                        <ArrowUpRight className="h-4 w-4 mr-2 text-emerald-500" />
                      ) : (
                        <ArrowDownRight className="h-4 w-4 mr-2 text-amber-500" />
                      )}
                      <div>
                        <div className="font-medium">{getTransactionTypeLabel(transaction.transaction_type)}</div>
                        <div className="text-xs text-muted-foreground">{format(new Date(transaction.created_at), 'MMM d, yyyy')}</div>
                      </div>
                    </div>
                    <div className={`font-medium ${transaction.transaction_type === 'topup' ? 'text-emerald-500' : 'text-amber-500'}`}>
                      {transaction.transaction_type === 'topup' ? '+' : '-'}{Math.abs(transaction.amount)} units
                    </div>
                  </div>
                ))}
                {transactions.length === 0 && (
                  <div className="text-center text-sm text-muted-foreground py-2">
                    No recent transactions
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Up Units</CardTitle>
            <CardDescription>Purchase more units for webinar enrollments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Amount Input */}
              <div className="mb-4">
                <Label htmlFor="amount" className="text-sm font-medium">
                  Amount (Units)
                </Label>
                <div className="relative mt-1">
                  <Input
                    id="amount"
                    type="number"
                    min="5"
                    value={topupAmount}
                    onChange={(e) => setTopupAmount(parseInt(e.target.value) || 0)}
                    className="pr-16"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center">
                    <span className="h-full flex items-center bg-muted px-4 text-sm font-medium rounded-r-md">
                      Units
                    </span>
                  </div>
                </div>
              </div>
              

              {/* Payment Method Selection */}
              <div>
                <h3 className="text-sm font-medium mb-3">Select Payment Method</h3>
                <RadioGroup
                  value={selectedPaymentMethod}
                  name="payment-method"
                  className="grid grid-cols-1 md:grid-cols-2 gap-4"
                  onValueChange={(value: string) => {
                    // Update selected payment method
                    setSelectedPaymentMethod(value as 'mpesa' | 'paystack');
                  }}
                >
                  {/* M-Pesa Payment Option */}
                  <div className="relative">
                    <RadioGroupItem
                      value="mpesa"
                      id="mpesa"
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor="mpesa"
                      className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer h-[140px]"
                    >
                      <div className="w-full h-full flex flex-col items-center justify-center">
                        <div className="flex-1 flex items-center justify-center py-4">
                          <Image
                            src="/images/payment-logos/mpesa.png"
                            alt="M-Pesa"
                            width={180}
                            height={60}
                            className="h-16 w-auto object-contain"
                            priority
                          />
                        </div>
                        <div className="text-center text-xs text-muted-foreground">
                          Pay directly from your M-Pesa mobile money account
                        </div>
                      </div>
                    </Label>
                  </div>
                  
                  {/* Paystack Payment Option */}
                  <div className="relative">
                    <RadioGroupItem
                      value="paystack"
                      id="paystack"
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor="paystack"
                      className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer h-[140px]"
                    >
                      <div className="w-full h-full flex flex-col items-center justify-center">
                        <div className="flex-1 flex items-center justify-center py-4">
                          <Image
                            src="/images/payment-logos/paystack.png"
                            alt="Paystack"
                            width={100}
                            height={30}
                            className="h-8 w-auto object-contain"
                            priority
                          />
                        </div>
                        <div className="text-center text-xs text-muted-foreground">
                          Pay securely with credit/debit card via Paystack
                        </div>
                      </div>
                    </Label>
                  </div>
                </RadioGroup>
              </div>
              
              {/* Mobile Number Input - Only shown for M-Pesa */}
              {selectedPaymentMethod === 'mpesa' && (
                <div className="mt-4 mb-4">
                  <Label htmlFor="mobileNumber" className="text-sm font-medium">
                    M-Pesa Mobile Number
                  </Label>
                  <div className="relative mt-1">
                    <Input
                      id="mobileNumber"
                      type="tel"
                      placeholder="e.g. 07XXXXXXXX"
                      value={mobileNumber}
                      onChange={(e) => setMobileNumber(e.target.value)}
                      className=""
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Enter the phone number to receive the M-Pesa payment prompt
                  </p>
                </div>
              )}
              
              {/* Payment Button */}
              <Button
                onClick={() => {
                  // For M-Pesa, validate mobile number first
                  if (selectedPaymentMethod === 'mpesa' && !mobileNumber) {
                    alert('Please enter your M-Pesa mobile number');
                    return;
                  }
                  
                  // Use the state-tracked selected payment method
                  handleTopup(selectedPaymentMethod);
                }}
                className="w-full mt-4"
                disabled={isProcessing || topupAmount < 5 || (selectedPaymentMethod === 'mpesa' && !mobileNumber)}
                size="lg"
              >
                {isProcessing ? (
                  <div className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing Payment...
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    <Plus className="mr-2 h-5 w-5" />
                    Pay {topupAmount > 0 ? `${topupAmount} Units` : ''}
                  </div>
                )}
              </Button>
              
              {/* Payment Info */}
              <div className="text-xs text-muted-foreground text-center pt-2">
                <p>Your payment is secure and processed instantly.</p>
                <p className="mt-1">Need help? <a href="#" className="text-primary hover:underline">Contact support</a></p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>


    </div>
  );
}
