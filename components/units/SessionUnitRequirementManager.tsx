"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { Loader2, Coins } from "lucide-react";
import { SessionUnitRequirement } from '@/types/units';

interface SessionUnitRequirementManagerProps {
  sessionId: string;
  sessionTitle?: string;
}

export default function SessionUnitRequirementManager({ 
  sessionId, 
  sessionTitle 
}: SessionUnitRequirementManagerProps) {
  const [unitRequirement, setUnitRequirement] = useState<SessionUnitRequirement | null>(null);
  const [unitsRequired, setUnitsRequired] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchUnitRequirement = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/admin/sessions/${sessionId}/unit-requirement`);
        if (!response.ok) {
          throw new Error('Failed to fetch unit requirement');
        }
        const data = await response.json();
        setUnitRequirement(data.unitRequirement);
        setUnitsRequired(data.unitRequirement.units_required);
      } catch (err) {
        console.error('Error fetching unit requirement:', err);
        toast({
          title: "Error",
          description: "Failed to load session unit requirement",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    if (sessionId) {
      fetchUnitRequirement();
    }
  }, [sessionId]);

  const handleSave = async () => {
    try {
      setSubmitting(true);
      const response = await fetch(`/api/admin/sessions/${sessionId}/unit-requirement`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          unitsRequired
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update unit requirement');
      }

      // Success
      toast({
        title: "Success",
        description: "Session unit requirement updated successfully",
        variant: "default"
      });

      setUnitRequirement(data.unitRequirement);
    } catch (err) {
      console.error('Error updating unit requirement:', err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to update unit requirement",
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
          Session Unit Requirement
        </CardTitle>
        <CardDescription>
          {sessionTitle ? (
            <>Set the number of units required to enroll in <strong>{sessionTitle}</strong></>
          ) : (
            'Set the number of units required to enroll in this session'
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Loading...
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="units-required">Units Required</Label>
              <div className="flex items-center space-x-2">
                <Input
                  id="units-required"
                  type="number"
                  min="0"
                  value={unitsRequired}
                  onChange={(e) => setUnitsRequired(parseInt(e.target.value) || 0)}
                  className="flex-1"
                />
                <Button 
                  onClick={handleSave} 
                  disabled={submitting || unitsRequired === unitRequirement?.units_required}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save'
                  )}
                </Button>
              </div>
            </div>
            
            <div className="text-sm text-muted-foreground">
              Last updated: {unitRequirement?.updated_at ? (
                new Date(unitRequirement.updated_at).toLocaleString()
              ) : (
                'Never'
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
