"use client";

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdminUnitsManager from '@/components/units/AdminUnitsManager';
import SessionUnitRequirementsList from './session-requirements';
import UnitCostManager from './unit-cost';

export default function AdminUnitsClient() {
  const [activeTab, setActiveTab] = useState('users');
  
  return (
    <Tabs defaultValue="users" onValueChange={setActiveTab} className="space-y-4">
      <TabsList>
        <TabsTrigger value="users">User Units</TabsTrigger>
        <TabsTrigger value="sessions">Session Requirements</TabsTrigger>
        <TabsTrigger value="cost">Unit Cost</TabsTrigger>
      </TabsList>
      
      <TabsContent value="users" className="space-y-4">
        <AdminUnitsManager />
      </TabsContent>
      
      <TabsContent value="sessions" className="space-y-4">
        <SessionUnitRequirementsList />
      </TabsContent>

      <TabsContent value="cost" className="space-y-4">
        <UnitCostManager />
      </TabsContent>
    </Tabs>
  );
}
