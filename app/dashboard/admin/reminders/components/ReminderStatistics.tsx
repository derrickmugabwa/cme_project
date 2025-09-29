'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon, Download, Mail, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface ReminderStats {
  totalSent: number;
  totalFailed: number;
  successRate: number;
  byType: Record<string, { sent: number; failed: number }>;
  byDay: Record<string, number>;
  recentActivity: Array<{
    date: string;
    sent: number;
    failed: number;
  }>;
}

export function ReminderStatistics() {
  const [stats, setStats] = useState<ReminderStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    to: new Date()
  });
  const [selectedType, setSelectedType] = useState<string>('all');

  useEffect(() => {
    fetchStats();
  }, [dateRange, selectedType]);

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        from: dateRange.from.toISOString(),
        to: dateRange.to.toISOString(),
        type: selectedType
      });

      const response = await fetch(`/api/admin/reminder-stats?${params}`);
      if (!response.ok) throw new Error('Failed to fetch statistics');

      const data = await response.json();
      setStats(data);
    } catch (error) {
      toast.error('Failed to load statistics');
      console.error('Error fetching stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const exportStats = async () => {
    try {
      const params = new URLSearchParams({
        from: dateRange.from.toISOString(),
        to: dateRange.to.toISOString(),
        type: selectedType,
        format: 'csv'
      });

      const response = await fetch(`/api/admin/reminder-stats/export?${params}`);
      if (!response.ok) throw new Error('Failed to export statistics');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `reminder-stats-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast.success('Statistics exported successfully');
    } catch (error) {
      toast.error('Failed to export statistics');
      console.error('Error exporting stats:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Loading...</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted animate-pulse rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <p className="text-muted-foreground">Failed to load statistics</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>
            Customize the date range and reminder type for statistics
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <div className="flex gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange.from ? format(dateRange.from, 'PPP') : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateRange.from}
                  onSelect={(date) => date && setDateRange(prev => ({ ...prev, from: date }))}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            
            <span className="flex items-center text-muted-foreground">to</span>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange.to ? format(dateRange.to, 'PPP') : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateRange.to}
                  onSelect={(date) => date && setDateRange(prev => ({ ...prev, to: date }))}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select reminder type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="24h">24 Hours Before</SelectItem>
              <SelectItem value="2h">2 Hours Before</SelectItem>
              <SelectItem value="1h">1 Hour Before</SelectItem>
              <SelectItem value="30min">30 Minutes Before</SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={exportStats} variant="outline" className="border-green-600 text-green-600 hover:bg-green-50">
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </CardContent>
      </Card>

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sent</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSent.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Reminder emails delivered
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.successRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Successful deliveries
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalFailed.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Failed deliveries
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Attempts</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(stats.totalSent + stats.totalFailed).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              All reminder attempts
            </p>
          </CardContent>
        </Card>
      </div>

      {/* By Type Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Performance by Reminder Type</CardTitle>
          <CardDescription>
            Success and failure rates for each reminder configuration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(stats.byType).map(([type, data]) => {
              const total = data.sent + data.failed;
              const successRate = total > 0 ? (data.sent / total) * 100 : 0;
              
              return (
                <div key={type} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">{type}</Badge>
                    <div className="text-sm">
                      <span className="font-medium">{data.sent} sent</span>
                      {data.failed > 0 && (
                        <span className="text-muted-foreground ml-2">
                          • {data.failed} failed
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      {successRate.toFixed(1)}% success
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {total} total
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            Daily reminder email activity over the selected period
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {stats.recentActivity.map((day) => (
              <div key={day.date} className="flex items-center justify-between p-2 hover:bg-muted/50 rounded">
                <div className="text-sm font-medium">
                  {format(new Date(day.date), 'MMM dd, yyyy')}
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-green-700 font-medium">
                    {day.sent} sent
                  </span>
                  {day.failed > 0 && (
                    <span className="text-red-600">
                      {day.failed} failed
                    </span>
                  )}
                </div>
              </div>
            ))}
            {stats.recentActivity.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                No activity in the selected date range
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
