"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/client';
import { LoadingSection } from '@/components/ui/loading-spinner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ChevronLeftIcon, 
  ChevronRightIcon, 
  DownloadIcon,
  SearchIcon,
  FilterIcon
} from "lucide-react";

type Transaction = {
  id: string;
  user_id: string;
  amount: number;
  units_purchased: number;
  payment_method: string;
  status: string;
  provider_reference: string;
  created_at: string;
  user_email?: string;
  user_name?: string;
};

export default function TransactionList() {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize] = useState(10);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('created_at');
  const [sortOrder, setSortOrder] = useState<string>('desc');
  const supabase = createClient();

  useEffect(() => {
    fetchTransactions();
  }, [page, statusFilter, methodFilter, searchQuery, sortBy, sortOrder]);

  async function fetchTransactions() {
    try {
      setLoading(true);
      
      // Start building the query
      let query = supabase
        .from('payment_transactions')
        .select(`
          *,
          profiles:user_id (
            email,
            full_name
          )
        `);
      
      // Apply filters
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      
      if (methodFilter !== 'all') {
        query = query.eq('payment_method', methodFilter);
      }
      
      if (searchQuery) {
        query = query.or(`provider_reference.ilike.%${searchQuery}%,profiles.email.ilike.%${searchQuery}%,profiles.full_name.ilike.%${searchQuery}%`);
      }
      
      // Apply sorting
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });
      
      // Apply pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      
      // Execute the query
      const { data, error, count } = await query
        .range(from, to)
        .limit(pageSize);
      
      if (error) {
        console.error('Error fetching transactions:', error);
        return;
      }
      
      // Format the transactions data
      const formattedData = data.map((item: any) => ({
        id: item.id,
        user_id: item.user_id,
        amount: item.amount,
        units_purchased: item.units_purchased,
        payment_method: item.payment_method,
        status: item.status,
        provider_reference: item.provider_reference,
        created_at: new Date(item.created_at).toLocaleString(),
        user_email: item.profiles?.email,
        user_name: item.profiles?.full_name
      }));
      
      setTransactions(formattedData);
      
      // Calculate total pages
      if (count) {
        setTotalPages(Math.ceil(count / pageSize));
      }
    } catch (error) {
      console.error('Error in transaction list:', error);
    } finally {
      setLoading(false);
    }
  }

  async function exportToCsv() {
    try {
      // Get all transactions with current filters but no pagination
      let query = supabase
        .from('payment_transactions')
        .select(`
          *,
          profiles:user_id (
            email,
            full_name
          )
        `);
      
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      
      if (methodFilter !== 'all') {
        query = query.eq('payment_method', methodFilter);
      }
      
      if (searchQuery) {
        query = query.or(`provider_reference.ilike.%${searchQuery}%,profiles.email.ilike.%${searchQuery}%,profiles.full_name.ilike.%${searchQuery}%`);
      }
      
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Error exporting transactions:', error);
        return;
      }
      
      // Format data for CSV
      const formattedData = data.map((item: any) => ({
        id: item.id,
        user_email: item.profiles?.email || 'N/A',
        user_name: item.profiles?.full_name || 'N/A',
        amount: item.amount,
        units_purchased: item.units_purchased,
        payment_method: item.payment_method,
        status: item.status,
        provider_reference: item.provider_reference,
        created_at: new Date(item.created_at).toLocaleString()
      }));
      
      // Convert to CSV
      const headers = Object.keys(formattedData[0]);
      const csvContent = [
        headers.join(','),
        ...formattedData.map(row => 
          headers.map(header => 
            JSON.stringify(row[header as keyof typeof row] || '')
          ).join(',')
        )
      ].join('\n');
      
      // Create download link
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `payment_transactions_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error exporting to CSV:', error);
    }
  }

  function getStatusBadgeColor(status: string) {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  if (loading && transactions.length === 0) {
    return <LoadingSection />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment Transactions</CardTitle>
        <CardDescription>View and manage all payment transactions</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row gap-4 mb-4 items-end">
          <div className="flex-1">
            <label className="text-sm font-medium mb-1 block">Search</label>
            <div className="relative">
              <SearchIcon className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by reference or user..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          
          <div>
            <label className="text-sm font-medium mb-1 block">Status</label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label className="text-sm font-medium mb-1 block">Payment Method</label>
            <Select value={methodFilter} onValueChange={setMethodFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Methods</SelectItem>
                <SelectItem value="mpesa">M-Pesa</SelectItem>
                <SelectItem value="paystack">Paystack</SelectItem>
                <SelectItem value="pesapal">PesaPal</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label className="text-sm font-medium mb-1 block">Sort By</label>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_at">Date</SelectItem>
                <SelectItem value="amount">Amount</SelectItem>
                <SelectItem value="units_purchased">Units</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label className="text-sm font-medium mb-1 block">Order</label>
            <Select value={sortOrder} onValueChange={setSortOrder}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Order" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">Descending</SelectItem>
                <SelectItem value="asc">Ascending</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <Button onClick={exportToCsv} className="flex items-center gap-2">
            <DownloadIcon className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
        
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Units</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-4">
                    No transactions found
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>{transaction.created_at}</TableCell>
                    <TableCell>
                      <div className="font-medium">{transaction.user_name || 'Unknown'}</div>
                      <div className="text-sm text-muted-foreground">{transaction.user_email}</div>
                    </TableCell>
                    <TableCell>
                      {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: 'KES'
                      }).format(transaction.amount)}
                    </TableCell>
                    <TableCell>{transaction.units_purchased}</TableCell>
                    <TableCell className="capitalize">{transaction.payment_method}</TableCell>
                    <TableCell className="font-mono text-xs">{transaction.provider_reference}</TableCell>
                    <TableCell>
                      <Badge className={getStatusBadgeColor(transaction.status)}>
                        {transaction.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        
        {totalPages > 1 && (
          <div className="flex items-center justify-end space-x-2 py-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page > 1 ? page - 1 : 1)}
              disabled={page === 1}
            >
              <ChevronLeftIcon className="h-4 w-4" />
              Previous
            </Button>
            <div className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page < totalPages ? page + 1 : totalPages)}
              disabled={page === totalPages}
            >
              Next
              <ChevronRightIcon className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
