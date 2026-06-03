"use client";

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Check, ChevronsUpDown, Coins, Loader2, UserRound } from "lucide-react";

interface Profile {
  id: string;
  full_name: string;
  email: string;
  units?: number;
}

export default function AdminUnitsManager() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [userPickerOpen, setUserPickerOpen] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [notes, setNotes] = useState('');

  const selectedUser = useMemo(
    () => profiles.find(profile => profile.id === selectedUserId),
    [profiles, selectedUserId]
  );

  const visibleProfiles = useMemo(() => {
    const term = userSearchTerm.trim().toLowerCase();
    const matchingProfiles = term
      ? profiles.filter(profile => {
          const searchableText = [
            profile.full_name,
            profile.email,
            profile.id,
          ].filter(Boolean).join(' ').toLowerCase();

          return searchableText.includes(term);
        })
      : profiles;

    return matchingProfiles.slice(0, 80);
  }, [profiles, userSearchTerm]);

  const matchingProfileCount = useMemo(() => {
    const term = userSearchTerm.trim().toLowerCase();

    if (!term) {
      return profiles.length;
    }

    return profiles.filter(profile => {
      const searchableText = [
        profile.full_name,
        profile.email,
        profile.id,
      ].filter(Boolean).join(' ').toLowerCase();

      return searchableText.includes(term);
    }).length;
  }, [profiles, userSearchTerm]);

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

  const getProfileName = (profile: Profile) => profile.full_name || profile.email || 'Unnamed user';

  const getInitials = (profile: Profile) => {
    const source = getProfileName(profile);
    return source
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part[0]?.toUpperCase())
      .join('') || 'U';
  };

  const formatUnits = (units?: number) => `${units ?? 0} Units`;

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
          <div className="space-y-2">
            <Label htmlFor="user-select">Select User</Label>
            <Popover
              open={userPickerOpen}
              onOpenChange={(open) => {
                setUserPickerOpen(open);
                if (!open) {
                  setUserSearchTerm('');
                }
              }}
            >
              <PopoverTrigger asChild>
                <Button
                  id="user-select"
                  type="button"
                  variant="outline"
                  role="combobox"
                  aria-expanded={userPickerOpen}
                  disabled={loading}
                  className="h-auto min-h-11 w-full justify-between gap-3 px-3 py-2 text-left font-normal"
                >
                  {loading ? (
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading users...
                    </span>
                  ) : selectedUser ? (
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-50 text-sm font-semibold text-green-700">
                        {getInitials(selectedUser)}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-foreground">
                          {getProfileName(selectedUser)}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {selectedUser.email}
                        </span>
                      </span>
                    </span>
                  ) : (
                    <span className="flex min-w-0 items-center gap-3 text-muted-foreground">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
                        <UserRound className="h-4 w-4" />
                      </span>
                      Search by name or email
                    </span>
                  )}
                  <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command shouldFilter={false}>
                  <CommandInput
                    placeholder="Search users by name or email..."
                    value={userSearchTerm}
                    onValueChange={setUserSearchTerm}
                    className="h-11"
                  />
                  <CommandList className="max-h-80">
                    {matchingProfileCount === 0 ? (
                      <CommandEmpty>No matching users found.</CommandEmpty>
                    ) : (
                      <CommandGroup
                        heading={
                          matchingProfileCount > visibleProfiles.length
                            ? `Showing ${visibleProfiles.length} of ${matchingProfileCount} users`
                            : `${matchingProfileCount} users`
                        }
                      >
                        {visibleProfiles.map(profile => (
                        <CommandItem
                          key={profile.id}
                          value={`${getProfileName(profile)} ${profile.email} ${profile.id}`}
                          onSelect={() => {
                            setSelectedUserId(profile.id);
                            setUserPickerOpen(false);
                          }}
                          className="items-start gap-3 py-3"
                        >
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-50 text-sm font-semibold text-green-700">
                            {getInitials(profile)}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-medium">{getProfileName(profile)}</span>
                            <span className="block truncate text-xs text-muted-foreground">{profile.email}</span>
                          </span>
                          <span className="flex shrink-0 items-center gap-2">
                            <Badge variant="secondary" className="font-normal">
                              {formatUnits(profile.units)}
                            </Badge>
                            <Check
                              className={`h-4 w-4 ${selectedUserId === profile.id ? 'opacity-100' : 'opacity-0'}`}
                            />
                          </span>
                        </CommandItem>
                        ))}
                      </CommandGroup>
                    )}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {selectedUser && (
            <div className="rounded-lg border bg-muted/30 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-50 text-sm font-semibold text-green-700">
                    {getInitials(selectedUser)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{getProfileName(selectedUser)}</p>
                    <p className="truncate text-xs text-muted-foreground">{selectedUser.email}</p>
                  </div>
                </div>
                <Badge variant="outline" className="shrink-0">
                  {formatUnits(selectedUser.units)}
                </Badge>
              </div>
            </div>
          )}

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
            className="w-full bg-[#008C45] hover:bg-[#006633] text-white"
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
