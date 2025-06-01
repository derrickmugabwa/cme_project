"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { Loader2, Coins, Search } from "lucide-react";

interface Profile {
  id: string;
  full_name: string;
  email: string;
  units?: number;
}

export default function AdminUnitsManager() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [filteredProfiles, setFilteredProfiles] = useState<Profile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [amount, setAmount] = useState<number>(0);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        setLoading(true);
        // Fetch all profiles with their unit balances
        const response = await fetch('/api/admin/profiles?includeUnits=true');
        if (!response.ok) {
          throw new Error('Failed to fetch profiles');
        }
        const data = await response.json();
        setProfiles(data.profiles || []);
        setFilteredProfiles(data.profiles || []);
      } catch (err) {
        console.error('Error fetching profiles:', err);
        toast({
          title: "Error",
          description: "Failed to load user profiles",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchProfiles();
  }, []);

  useEffect(() => {
    // Filter profiles based on search term
    if (searchTerm.trim() === '') {
      setFilteredProfiles(profiles);
    } else {
      const term = searchTerm.toLowerCase();
      const filtered = profiles.filter(profile => 
        profile.full_name.toLowerCase().includes(term) || 
        profile.email.toLowerCase().includes(term)
      );
      setFilteredProfiles(filtered);
    }
  }, [searchTerm, profiles]);

  const handleTopUp = async () => {
    if (!selectedUserId) {
      toast({
        title: "Error",
        description: "Please select a user",
        variant: "destructive"
      });
      return;
    }

    if (!amount || amount <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid amount greater than 0",
        variant: "destructive"
      });
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch('/api/admin/units/topup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: selectedUserId,
          amount,
          notes
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to top up units');
      }

      // Success
      toast({
        title: "Success",
        description: `Successfully added ${amount} units to the user's account`,
        variant: "default"
      });

      // Reset form
      setAmount(0);
      setNotes('');
      
      // Refresh profiles to show updated units
      const updatedProfiles = [...profiles];
      const userIndex = updatedProfiles.findIndex(p => p.id === selectedUserId);
      if (userIndex !== -1) {
        updatedProfiles[userIndex].units = (updatedProfiles[userIndex].units || 0) + amount;
        setProfiles(updatedProfiles);
      }
    } catch (err) {
      console.error('Error topping up units:', err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to top up units",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Coins className="h-5 w-5" />
          Manage User Units
        </CardTitle>
        <CardDescription>
          Add units to user accounts or view current balances
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="user-select">Select User</Label>
            <Select
              value={selectedUserId}
              onValueChange={setSelectedUserId}
              disabled={loading}
            >
              <SelectTrigger id="user-select">
                <SelectValue placeholder="Select a user" />
              </SelectTrigger>
              <SelectContent>
                {loading ? (
                  <div className="flex items-center justify-center py-2">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Loading users...
                  </div>
                ) : filteredProfiles.length === 0 ? (
                  <div className="p-2 text-center text-sm text-muted-foreground">
                    No users found
                  </div>
                ) : (
                  filteredProfiles.map(profile => (
                    <SelectItem key={profile.id} value={profile.id}>
                      <div className="flex justify-between w-full">
                        <span>{profile.full_name}</span>
                        <span className="text-muted-foreground">
                          {profile.units !== undefined ? `${profile.units} Units` : 'No wallet'}
                        </span>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount to Add</Label>
            <Input
              id="amount"
              type="number"
              min="1"
              value={amount || ''}
              onChange={(e) => setAmount(parseInt(e.target.value) || 0)}
              placeholder="Enter amount"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add a note about this top-up"
              rows={3}
            />
          </div>

          <Button
            onClick={handleTopUp}
            disabled={submitting || !selectedUserId || amount <= 0}
            className="w-full"
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              'Top Up Units'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
