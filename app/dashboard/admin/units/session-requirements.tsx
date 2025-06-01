"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Search, Coins, Edit2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import SessionUnitRequirementManager from '@/components/units/SessionUnitRequirementManager';

interface Session {
  id: string;
  title: string;
  start_time: string;
  units_required?: number;
}

export default function SessionUnitRequirementsList() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [filteredSessions, setFilteredSessions] = useState<Session[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        setLoading(true);
        // Fetch all sessions with their unit requirements
        const response = await fetch('/api/admin/sessions?includeUnitRequirements=true');
        if (!response.ok) {
          throw new Error('Failed to fetch sessions');
        }
        const data = await response.json();
        setSessions(data.sessions || []);
        setFilteredSessions(data.sessions || []);
      } catch (err) {
        console.error('Error fetching sessions:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSessions();
  }, []);

  useEffect(() => {
    // Filter sessions based on search term
    if (searchTerm.trim() === '') {
      setFilteredSessions(sessions);
    } else {
      const term = searchTerm.toLowerCase();
      const filtered = sessions.filter(session => 
        session.title.toLowerCase().includes(term)
      );
      setFilteredSessions(filtered);
    }
  }, [searchTerm, sessions]);

  const handleEditRequirement = (session: Session) => {
    setSelectedSession(session);
    setIsDialogOpen(true);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Session Unit Requirements</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Session Unit Requirements</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search sessions..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {filteredSessions.length === 0 ? (
              <div className="py-6 text-center text-muted-foreground">
                No sessions found
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Session Title</TableHead>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Units Required</TableHead>
                      <TableHead className="w-24">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSessions.map((session) => (
                      <TableRow key={session.id}>
                        <TableCell className="font-medium">{session.title}</TableCell>
                        <TableCell>{formatDate(session.start_time)}</TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Coins className="mr-1 h-4 w-4 text-muted-foreground" />
                            <span>{session.units_required || 1}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleEditRequirement(session)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Unit Requirement</DialogTitle>
          </DialogHeader>
          {selectedSession && (
            <SessionUnitRequirementManager 
              sessionId={selectedSession.id} 
              sessionTitle={selectedSession.title} 
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
