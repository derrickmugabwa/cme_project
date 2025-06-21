import { useState, useEffect } from 'react';
import { createClient } from '@/lib/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Save, AlertCircle, CheckCircle } from 'lucide-react';

interface SessionAttendanceSettingsProps {
  sessionId: string;
}

export default function SessionAttendanceSettings({ sessionId }: SessionAttendanceSettingsProps) {
  const [settings, setSettings] = useState({
    minAttendanceMinutes: 30,
    usePercentage: true,
    attendancePercentage: 50
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    fetchSettings();
  }, [sessionId]);

  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/sessions/${sessionId}/settings`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch session settings');
      }

      const data = await response.json();
      
      setSettings({
        minAttendanceMinutes: data.min_attendance_minutes,
        usePercentage: data.use_percentage || false,
        attendancePercentage: data.attendance_percentage || 50
      });
    } catch (err: any) {
      setError(err.message || 'An error occurred while fetching settings');
      console.error('Error fetching session settings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);
      setSaveSuccess(false);
      
      // Use fetch API instead of direct Supabase call
      const response = await fetch(`/api/sessions/${sessionId}/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          min_attendance_minutes: settings.minAttendanceMinutes,
          use_percentage: settings.usePercentage,
          attendance_percentage: settings.attendancePercentage
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update settings');
      }

      setSaveSuccess(true);
      
      // Hide success message after 3 seconds
      setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'An error occurred while saving settings');
      console.error('Error saving session settings:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    
    if (type === 'checkbox') {
      setSettings({
        ...settings,
        [name]: checked
      });
    } else {
      const numValue = parseInt(value);
      if (!isNaN(numValue) && numValue >= 0) {
        setSettings({
          ...settings,
          [name]: numValue
        });
      }
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Attendance Requirements</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
            <span className="ml-2">Loading settings...</span>
          </div>
        ) : (
          <div className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            {saveSuccess && (
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <AlertDescription className="text-green-700">
                  Settings saved successfully
                </AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <input
                  id="usePercentage"
                  name="usePercentage"
                  type="checkbox"
                  checked={settings.usePercentage}
                  onChange={handleInputChange}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <Label htmlFor="usePercentage">
                  Use percentage of meeting duration instead of fixed minutes
                </Label>
              </div>
              
              {settings.usePercentage ? (
                <div className="space-y-2">
                  <Label htmlFor="attendancePercentage">
                    Required Attendance Percentage
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="attendancePercentage"
                      name="attendancePercentage"
                      type="number"
                      min="1"
                      max="100"
                      value={settings.attendancePercentage}
                      onChange={handleInputChange}
                      className="w-24"
                    />
                    <span className="text-sm text-gray-500">%</span>
                  </div>
                  <p className="text-sm text-gray-500">
                    Attendees must be present for at least this percentage of the total meeting duration to be eligible for a certificate.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="minAttendanceMinutes">
                    Minimum Attendance Duration
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="minAttendanceMinutes"
                      name="minAttendanceMinutes"
                      type="number"
                      min="0"
                      value={settings.minAttendanceMinutes}
                      onChange={handleInputChange}
                      className="w-24"
                    />
                    <span className="text-sm text-gray-500">minutes</span>
                  </div>
                  <p className="text-sm text-gray-500">
                    Attendees must be present for at least this duration to be eligible for a certificate.
                  </p>
                </div>
              )}
            </div>
            
            <Button 
              onClick={handleSave} 
              disabled={isLoading || isSaving}
              className="mt-4"
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Settings
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
