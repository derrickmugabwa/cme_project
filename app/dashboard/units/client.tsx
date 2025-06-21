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
import { Plus, RefreshCw, AlertTriangle, Wallet, TrendingUp, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import Image from 'next/image';
import { useToast } from "@/components/ui/use-toast";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { createBrowserClient } from '@supabase/ssr';

export default function UserUnitsClient() {
  const { toast } = useToast();
  // Initialize Supabase client
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // All useState hooks must be declared before any useEffect hooks
  const [units, setUnits] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<UnitTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>('');
  
  // Sample data for usage chart
  const [usageData, setUsageData] = useState([
    { name: 'Available', value: 25, color: '#4ade80' },
    { name: 'Used', value: 15, color: '#f87171' },
  ]);
  
  // Track units added this month for trend display
  const [addedThisMonth, setAddedThisMonth] = useState(0);
  // State for top-up form
  const [topupAmount, setTopupAmount] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'mpesa' | 'paystack' | 'pesapal'>('pesapal');
  const [unitCost, setUnitCost] = useState<{cost_per_unit: number, currency: string}>({cost_per_unit: 1.00, currency: 'KES'});
  const [calculatedCost, setCalculatedCost] = useState<string>('0.00');

  // Function to fetch user profile data
  const fetchUserProfile = async () => {
    try {
      // Get the session from Supabase
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      // Include the access token in the request
      const response = await fetch('/api/profile', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setUserEmail(data.email || '');
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };
  
  // Function to fetch units data
  const fetchUnits = async () => {
    try {
      // Get the current session to include the access token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Authentication required');
      }
      
      const response = await fetch('/api/units', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      
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

  // Function to fetch transactions data
  const fetchTransactions = async () => {
    try {
      // Get the current session to include the access token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Authentication required');
      }
      
      const response = await fetch('/api/units/transactions', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      
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
          totalUsed += Math.abs(transaction.amount);
        } else if (transaction.transaction_type === 'topup') {
          totalAdded += transaction.amount;
          
          // Check if transaction was in current month
          const transactionDate = new Date(transaction.created_at);
          if (transactionDate.getMonth() === currentMonth) {
            addedThisMonth += transaction.amount;
          }
        }
      });
      
      // Update the usage data for the chart
      const available = Math.max(0, totalAdded - totalUsed);
      setUsageData([
        { name: 'Available', value: available, color: '#4ade80' },
        { name: 'Used', value: totalUsed, color: '#f87171' },
      ]);
      
      // Update the added this month value
      setAddedThisMonth(addedThisMonth);
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError('Failed to load transaction history');
    }
  };

  // Function to fetch unit cost
  const fetchUnitCost = async () => {
    try {
      const { data } = await supabase.rpc('get_current_unit_cost');
      
      if (data) {
        setUnitCost({
          cost_per_unit: parseFloat(data.cost_per_unit),
          currency: data.currency
        });
      }
    } catch (err) {
      console.error('Error fetching unit cost:', err);
      // Use default values if there's an error
      setUnitCost({
        cost_per_unit: 1.00,
        currency: 'KES'
      });
    }
  };
  
  // Calculate cost whenever unit amount changes
  useEffect(() => {
    if (topupAmount > 0 && unitCost) {
      const total = topupAmount * unitCost.cost_per_unit;
      setCalculatedCost(total.toFixed(2));
    } else {
      setCalculatedCost('0.00');
    }
  }, [topupAmount, unitCost]);
  
  // Initial data fetch
  useEffect(() => {
    fetchUserProfile();
    fetchUnits();
    fetchTransactions();
    fetchUnitCost();
  }, []);

  useEffect(() => {
    // Fetch both units and transactions data when component mounts
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        await Promise.all([fetchUnits(), fetchTransactions()]);
      } catch (err) {
        console.error('Error loading data:', err);
        setError('Failed to load dashboard data. Please try refreshing the page.');
        toast({
          title: "Loading Error",
          description: "There was a problem loading your units data. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
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
  const handleTopup = async (method: 'mpesa' | 'paystack' | 'pesapal') => {
    if (topupAmount < 1) {
      toast({
        title: "Invalid amount",
        description: "Minimum top-up amount is 1 unit",
        variant: "destructive",
      });
      return;
    }
    
    // Make sure topupAmount is treated as a number
    const amount = Number(topupAmount);

    // For M-Pesa, validate mobile number (temporarily disabled)
    if (method === 'mpesa') {
      // M-Pesa is currently hidden from UI
      // Will be re-enabled in the future
      return;
    }

    setIsProcessing(true);

    try {
      // Get the current session to include the access token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Authentication required');
      }
      
      // Step 1: Create a payment transaction
      const initResponse = await fetch('/api/units/topup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          unitsAmount: amount,
          paymentMethod: method
        }),
      });
      
      const initData = await initResponse.json();
      
      if (!initResponse.ok) {
        throw new Error(initData.error || 'Failed to initiate payment');
      }
      
      // Step 2: Process payment based on method
      if (method === 'mpesa' as 'mpesa' | 'paystack' | 'pesapal') {
        // Initiate M-Pesa payment
        const mpesaResponse = await fetch('/api/payments/mpesa/initiate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            transaction_id: initData.transaction_id,
            phone_number: '07XXXXXXXX' // Placeholder, M-Pesa is temporarily disabled
          }),
        });
        
        const mpesaData = await mpesaResponse.json();
        
        if (!mpesaResponse.ok) {
          throw new Error(mpesaData.error || 'Failed to initiate M-Pesa payment');
        }
        
        toast({
          title: "Payment initiated",
          description: "Please check your phone to complete the M-Pesa payment",
        });
        
        // Start polling for payment status
        pollPaymentStatus(initData.transaction_id);
        
        // M-Pesa mobile number handling is temporarily disabled
        // Will be re-enabled in the future
      } else if (method === 'paystack') {
        // Get the current session to include the access token
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          throw new Error('Authentication required');
        }
        
        // Initiate Paystack payment
        const paystackResponse = await fetch('/api/payments/paystack/initiate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            transaction_id: initData.transaction_id,
            email: userEmail || 'user@example.com' // Use the email from user profile
          }),
        });
        
        const paystackData = await paystackResponse.json();
        
        if (!paystackResponse.ok) {
          throw new Error(paystackData.error || 'Failed to initiate Paystack payment');
        }
        
        // Redirect to Paystack payment page
        window.location.href = paystackData.authorization_url;
      } else if (method === 'pesapal') {
        // Get the current session to include the access token
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          throw new Error('Authentication required');
        }
        
        // Initiate PesaPal payment
        const pesapalResponse = await fetch('/api/payments/pesapal/initiate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            transaction_id: initData.transaction_id,
            email: userEmail || 'user@example.com' // Use the email from user profile
          }),
        });
        
        const pesapalData = await pesapalResponse.json();
        
        if (!pesapalResponse.ok) {
          throw new Error(pesapalData.error || 'Failed to initiate PesaPal payment');
        }
        
        // Redirect to PesaPal payment page
        window.location.href = pesapalData.authorization_url;
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast({
        title: "Payment failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
      setIsProcessing(false);
    }
  };
  
  // Poll payment status for M-Pesa and other payment methods
  const pollPaymentStatus = async (transactionId: string) => {
    const maxAttempts = 20; // Increased from 10 to 20 attempts
    let attempts = 0;
    
    const checkStatus = async () => {
      try {
        // Get the current session to include the access token
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          throw new Error('Authentication required');
        }
        
        const response = await fetch(`/api/payments/status?transaction_id=${transactionId}`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        });
        const data = await response.json();
        
        if (data.transaction?.status === 'completed') {
          // Payment successful
          toast({
            title: "Payment successful",
            description: `${data.transaction.units_purchased} units have been added to your account`,
          });
          setIsProcessing(false);
          
          // Refresh units data
          fetchUnits();
          fetchTransactions();
          return;
        } else if (data.transaction?.status === 'failed') {
          // Payment failed
          toast({
            title: "Payment failed",
            description: "Your payment could not be processed",
            variant: "destructive",
          });
          setIsProcessing(false);
          return;
        }
        
        // If still pending and not exceeded max attempts, check again
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(checkStatus, 5000); // Check every 5 seconds
        } else {
          // Max attempts reached, but don't mark as failed yet
          toast({
            title: "Payment pending",
            description: "Your payment is being processed. You can manually verify it below.",
          });
          setIsProcessing(false);
          
          // Payment is still being processed in the background
          // The user will see their units update on next page refresh
        }
      } catch (error) {
        console.error('Error checking payment status:', error);
        toast({
          title: "Error checking payment",
          description: "Could not verify payment status",
          variant: "destructive",
        });
        setIsProcessing(false);
      }
    };
    
    // Start checking status
    setTimeout(checkStatus, 5000); // Wait 5 seconds before first check
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
                    min="1"
                    step="1"
                    value={topupAmount}
                    onChange={(e) => {
                      const value = parseInt(e.target.value);
                      setTopupAmount(isNaN(value) ? 0 : value);
                    }}
                    className="pr-16"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center">
                    <span className="h-full flex items-center bg-muted px-4 text-sm font-medium rounded-r-md">
                      Units
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Calculated Cost Display */}
              <div className="mt-2">
                <div className="flex justify-between items-center py-2 px-3 bg-muted/50 rounded-md">
                  <span className="text-sm font-medium">Total Cost:</span>
                  <span className="text-sm font-bold">{calculatedCost} {unitCost.currency}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1 text-right">
                  Rate: {unitCost.cost_per_unit} {unitCost.currency} per unit
                </p>
              </div>

              {/* Payment Method */}
              <div>
                <h3 className="text-sm font-medium mb-3">Payment Method</h3>
                <RadioGroup
                  value="pesapal" // Default to PesaPal
                  name="payment-method"
                  className="grid grid-cols-1 gap-4"
                  onValueChange={(value: 'mpesa' | 'paystack' | 'pesapal') => {
                    // Always use PesaPal
                    setSelectedPaymentMethod('pesapal');
                  }}
                >
                  {/* PesaPal Payment Option - Only visible option */}
                  <div className="relative">
                    <RadioGroupItem
                      value="pesapal"
                      id="pesapal"
                      className="peer sr-only"
                      checked
                    />
                    <Label
                      htmlFor="pesapal"
                      className="flex flex-col items-center justify-between rounded-md border-2 border-primary bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer h-[140px]"
                    >
                      <div className="w-full h-full flex flex-col items-center justify-center">
                        <div className="flex flex-col items-center justify-center space-y-0">
                          <div>
                            <Image
                              src="/images/payment-logos/pesapal.png"
                              alt="PesaPal"
                              width={300}
                              height={100}
                              className="h-28 w-auto object-contain -mb-1"
                              priority
                            />
                          </div>
                          <div className="text-center text-sm font-medium -mt-1">
                            Pay with cards, mobile money & bank via PesaPal
                          </div>
                        </div>
                      </div>
                    </Label>
                  </div>
                </RadioGroup>
              </div>
              
              {/* Payment Button */}
              <Button
                onClick={() => {
                  // Always use PesaPal
                  handleTopup('pesapal');
                }}
                className="w-full mt-4"
                disabled={isProcessing || topupAmount < 1}
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
              
              {/* Payment processing happens automatically */}
              
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
