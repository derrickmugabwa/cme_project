"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Coins } from "lucide-react";
import { format } from 'date-fns';
import { UnitTransaction } from '@/types/units';

export default function UserUnitsWallet() {
  const [units, setUnits] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<UnitTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAllTransactions, setShowAllTransactions] = useState(false);

  useEffect(() => {
    const fetchUnits = async () => {
      try {
        const response = await fetch('/api/units');
        if (!response.ok) {
          throw new Error('Failed to fetch units');
        }
        const data = await response.json();
        setUnits(data.units);
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
        setTransactions(data.transactions || []);
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

  const displayedTransactions = showAllTransactions 
    ? transactions 
    : transactions.slice(0, 3);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5" />
            <Skeleton className="h-6 w-24" />
          </CardTitle>
          <CardDescription>
            <Skeleton className="h-4 w-48" />
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5" />
            Units Wallet
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-4 text-center text-red-500">
            {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Coins className="h-5 w-5" />
          Units Wallet
        </CardTitle>
        <CardDescription>
          Your current balance and transaction history
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4 p-4 bg-gray-50 rounded-md flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-500">Current Balance</div>
            <div className="text-2xl font-bold">{units} Units</div>
          </div>
          <Coins className="h-8 w-8 text-primary" />
        </div>

        <div className="space-y-1">
          <h3 className="text-sm font-medium">Recent Transactions</h3>
          
          {displayedTransactions.length === 0 ? (
            <div className="py-3 text-center text-sm text-gray-500">
              No transactions yet
            </div>
          ) : (
            <div className="space-y-2 mt-2">
              {displayedTransactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-2 text-sm border-b">
                  <div>
                    <Badge 
                      variant="outline" 
                      className={getTransactionBadgeColor(transaction.transaction_type)}
                    >
                      {getTransactionTypeLabel(transaction.transaction_type)}
                    </Badge>
                    <div className="text-xs text-gray-500 mt-1">
                      {format(new Date(transaction.created_at), 'MMM d, yyyy')}
                    </div>
                  </div>
                  <div className="font-medium">
                    {transaction.amount > 0 ? '+' : ''}{transaction.amount} Units
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
      {transactions.length > 3 && (
        <CardFooter>
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full" 
            onClick={() => setShowAllTransactions(!showAllTransactions)}
          >
            {showAllTransactions ? 'Show Less' : `Show All (${transactions.length})`}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
