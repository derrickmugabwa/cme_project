'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Save, Trash2, Clock, Mail } from 'lucide-react';
import { toast } from 'sonner';

interface ReminderConfiguration {
  id: string;
  reminder_type: string;
  minutes_before: number;
  is_enabled: boolean;
  email_subject_template: string;
  display_name: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface ReminderConfigManagerProps {
  initialConfigs: ReminderConfiguration[];
}

export function ReminderConfigManager({ initialConfigs }: ReminderConfigManagerProps) {
  const [configs, setConfigs] = useState<ReminderConfiguration[]>(initialConfigs);
  const [isLoading, setIsLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const [newConfig, setNewConfig] = useState({
    reminder_type: '',
    minutes_before: 60,
    display_name: '',
    email_subject_template: '',
    is_enabled: true,
    sort_order: configs.length + 1
  });

  const updateConfig = async (id: string, updates: Partial<ReminderConfiguration>) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/reminder-configs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates })
      });

      if (!response.ok) throw new Error('Failed to update configuration');

      setConfigs(prev => prev.map(config => 
        config.id === id ? { ...config, ...updates } : config
      ));
      
      toast.success('Configuration updated successfully');
      setEditingId(null);
    } catch (error) {
      toast.error('Failed to update configuration');
      console.error('Error updating config:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const createConfig = async () => {
    if (!newConfig.reminder_type || !newConfig.display_name) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/reminder-configs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig)
      });

      if (!response.ok) throw new Error('Failed to create configuration');

      const created = await response.json();
      setConfigs(prev => [...prev, created]);
      
      toast.success('Configuration created successfully');
      setShowAddForm(false);
      setNewConfig({
        reminder_type: '',
        minutes_before: 60,
        display_name: '',
        email_subject_template: '',
        is_enabled: true,
        sort_order: configs.length + 2
      });
    } catch (error) {
      toast.error('Failed to create configuration');
      console.error('Error creating config:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteConfig = async (id: string) => {
    if (!confirm('Are you sure you want to delete this reminder configuration?')) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/reminder-configs', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });

      if (!response.ok) throw new Error('Failed to delete configuration');

      setConfigs(prev => prev.filter(config => config.id !== id));
      toast.success('Configuration deleted successfully');
    } catch (error) {
      toast.error('Failed to delete configuration');
      console.error('Error deleting config:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h`;
    return `${Math.floor(minutes / 1440)}d`;
  };

  return (
    <div className="space-y-6">
      {/* Existing Configurations */}
      <div className="grid gap-4">
        {configs.map((config) => (
          <Card key={config.id} className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-lg">{config.display_name}</CardTitle>
                  <Badge variant={config.is_enabled ? "default" : "secondary"} className={config.is_enabled ? "bg-green-100 text-green-800" : ""}>
                    {config.is_enabled ? "Enabled" : "Disabled"}
                  </Badge>
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDuration(config.minutes_before)} before
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={config.is_enabled}
                    onCheckedChange={(enabled) => updateConfig(config.id, { is_enabled: enabled })}
                    disabled={isLoading}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingId(editingId === config.id ? null : config.id)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteConfig(config.id)}
                    disabled={isLoading}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            
            {editingId === config.id && (
              <CardContent className="space-y-4 border-t pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor={`display-name-${config.id}`}>Display Name</Label>
                    <Input
                      id={`display-name-${config.id}`}
                      defaultValue={config.display_name}
                      onBlur={(e) => updateConfig(config.id, { display_name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor={`minutes-before-${config.id}`}>Minutes Before Session</Label>
                    <Input
                      id={`minutes-before-${config.id}`}
                      type="number"
                      defaultValue={config.minutes_before}
                      onBlur={(e) => updateConfig(config.id, { minutes_before: parseInt(e.target.value) })}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor={`subject-template-${config.id}`}>Email Subject Template</Label>
                  <Input
                    id={`subject-template-${config.id}`}
                    defaultValue={config.email_subject_template}
                    placeholder="Use {session_title} for dynamic content"
                    onBlur={(e) => updateConfig(config.id, { email_subject_template: e.target.value })}
                  />
                </div>
              </CardContent>
            )}
            
            {editingId !== config.id && (
              <CardContent className="pt-0">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {config.email_subject_template}
                  </span>
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {/* Add New Configuration */}
      {!showAddForm ? (
        <Button
          onClick={() => setShowAddForm(true)}
          className="w-full border-green-600 text-green-600 hover:bg-green-50"
          variant="outline"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add New Reminder Configuration
        </Button>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Add New Reminder Configuration</CardTitle>
            <CardDescription>
              Create a new reminder type with custom timing and messaging
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="new-reminder-type">Reminder Type</Label>
                <Input
                  id="new-reminder-type"
                  placeholder="e.g., 4h, 15min, 1d"
                  value={newConfig.reminder_type}
                  onChange={(e) => setNewConfig(prev => ({ ...prev, reminder_type: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="new-display-name">Display Name</Label>
                <Input
                  id="new-display-name"
                  placeholder="e.g., 4 Hours Before"
                  value={newConfig.display_name}
                  onChange={(e) => setNewConfig(prev => ({ ...prev, display_name: e.target.value }))}
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="new-minutes-before">Minutes Before Session</Label>
              <Input
                id="new-minutes-before"
                type="number"
                value={newConfig.minutes_before}
                onChange={(e) => setNewConfig(prev => ({ ...prev, minutes_before: parseInt(e.target.value) }))}
              />
            </div>
            
            <div>
              <Label htmlFor="new-subject-template">Email Subject Template</Label>
              <Input
                id="new-subject-template"
                placeholder="Starting Soon: {session_title} in 4 hours"
                value={newConfig.email_subject_template}
                onChange={(e) => setNewConfig(prev => ({ ...prev, email_subject_template: e.target.value }))}
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="new-enabled"
                checked={newConfig.is_enabled}
                onCheckedChange={(enabled) => setNewConfig(prev => ({ ...prev, is_enabled: enabled }))}
              />
              <Label htmlFor="new-enabled">Enable immediately</Label>
            </div>
            
            <div className="flex gap-2">
              <Button onClick={createConfig} disabled={isLoading} className="bg-green-600 hover:bg-green-700 text-white">
                <Save className="h-4 w-4 mr-2" />
                Create Configuration
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowAddForm(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
