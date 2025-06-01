"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from 'date-fns';
import { UnitTransaction } from '@/types/units';

export default function UserUnitsClient() {
  const [units, setUnits] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<UnitTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Current Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-12 w-32" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Transaction History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          </CardContent>
        </Card>
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Current Balance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{units} Units</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="py-6 text-center text-muted-foreground">
              No transactions yet
            </div>
          ) : (
            <div className="space-y-4">
              {transactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-md">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant="outline" 
                        className={getTransactionBadgeColor(transaction.transaction_type)}
                      >
                        {getTransactionTypeLabel(transaction.transaction_type)}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(transaction.created_at), 'MMM d, yyyy h:mm a')}
                      </span>
                    </div>
                    {transaction.notes && (
                      <div className="mt-1 text-sm text-muted-foreground">
                        {transaction.notes}
                      </div>
                    )}
                  </div>
                  <div className="text-lg font-medium">
                    {transaction.amount > 0 ? '+' : ''}{transaction.amount} Units
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
