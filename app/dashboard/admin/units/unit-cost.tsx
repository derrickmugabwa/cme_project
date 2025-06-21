"use client";

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Save } from "lucide-react";

export default function UnitCostManager() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { toast } = useToast();
  
  const [costPerUnit, setCostPerUnit] = useState<string>('1.00');
  const [currency, setCurrency] = useState<string>('KES');
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  
  // Fetch current unit cost setting
  useEffect(() => {
    async function fetchUnitCost() {
      setLoading(true);
      
      try {
        const { data, error } = await supabase.rpc('get_current_unit_cost');
        
        if (error) {
          throw error;
        }
        
        if (data) {
          setCostPerUnit(data.cost_per_unit.toString());
          setCurrency(data.currency);
          
          // Format the last updated date
          const updatedDate = new Date(data.updated_at);
          setLastUpdated(updatedDate.toLocaleString());
        }
      } catch (error) {
        console.error('Error fetching unit cost:', error);
        toast({
          title: "Error",
          description: "Failed to load unit cost setting",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }
    
    fetchUnitCost();
  }, [supabase, toast]);
  
  // Handle save
  const handleSave = async () => {
    setSaving(true);
    
    try {
      // Validate input
      const cost = parseFloat(costPerUnit);
      if (isNaN(cost) || cost <= 0) {
        throw new Error('Cost per unit must be a positive number');
      }
      
      // Update unit cost
      const { data, error } = await supabase.rpc('update_unit_cost', {
        p_cost_per_unit: cost,
        p_currency: currency
      });
      
      if (error) {
        throw error;
      }
      
      if (data && data.success) {
        toast({
          title: "Success",
          description: "Unit cost updated successfully",
        });
        
        // Update last updated date
        const updatedDate = new Date();
        setLastUpdated(updatedDate.toLocaleString());
      } else {
        throw new Error(data?.message || 'Failed to update unit cost');
      }
    } catch (error: any) {
      console.error('Error updating unit cost:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update unit cost",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Unit Cost Setting</CardTitle>
        <CardDescription>
          Configure the cost of one unit. This will be used to calculate payment amounts when users top up.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="costPerUnit">Cost Per Unit</Label>
                <Input
                  id="costPerUnit"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={costPerUnit}
                  onChange={(e) => setCostPerUnit(e.target.value)}
                  placeholder="1.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Input
                  id="currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  placeholder="KES"
                />
              </div>
            </div>
            
            {lastUpdated && (
              <p className="text-sm text-muted-foreground">
                Last updated: {lastUpdated}
              </p>
            )}
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button 
          onClick={handleSave} 
          disabled={loading || saving}
          className="ml-auto"
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
