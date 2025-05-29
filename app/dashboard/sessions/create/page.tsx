"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// Supabase client will be initialized in the component

export default function CreateSessionPage() {
  const router = useRouter();
  
  // State for Microsoft authentication
  const [hasMicrosoftAuth, setHasMicrosoftAuth] = useState<boolean | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');
  const [isOnline, setIsOnline] = useState(false);
  const [location, setLocation] = useState('');
  const [courseId, setCourseId] = useState('');
  const [courses, setCourses] = useState<any[]>([]);
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  // Check Microsoft auth status
  useEffect(() => {
    async function checkMicrosoftAuth() {
      try {
        setCheckingAuth(true);
        console.log('Checking Microsoft connection status...');
        
        // Initialize Supabase client inside the component
        const supabase = createClient();
        
        // Get the current user
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          console.log('No authenticated user found');
          setHasMicrosoftAuth(false);
          setCheckingAuth(false);
          return;
        }
        
        console.log('Checking for Microsoft Graph tokens for user:', user.id);
        
        // Check if user has Microsoft Graph tokens
        const { data, error } = await supabase
          .from('ms_graph_tokens')
          .select('*')
          .eq('profile_id', user.id)
          .single();
        
        if (error) {
          console.log('No Microsoft Graph tokens found:', error.message);
          setHasMicrosoftAuth(false);
        } else if (data) {
          console.log('Microsoft Graph tokens found:', data);
          
          // Check if token is expired
          const expiresAt = new Date(data.expires_at);
          const now = new Date();
          const isValid = expiresAt > now;
          
          console.log(`Token expires at: ${expiresAt.toISOString()}, Current time: ${now.toISOString()}, Is valid: ${isValid}`);
          setHasMicrosoftAuth(isValid);
          
          if (!isValid) {
            console.log('Token is expired');
            setError('Microsoft token is expired. Please reconnect your account.');
          }
        } else {
          console.log('No Microsoft Graph tokens found');
          setHasMicrosoftAuth(false);
        }
      } catch (error) {
        console.error('Error checking Microsoft connection:', error);
        setHasMicrosoftAuth(false);
      } finally {
        setCheckingAuth(false);
      }
    }
    
    // Load courses
    async function loadCourses() {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from('courses')
          .select('id, title')
          .eq('is_active', true);
        
        if (data) {
          setCourses(data);
        }
      } catch (error) {
        console.error('Error loading courses:', error);
      }
    }
    
    checkMicrosoftAuth();
    loadCourses();
  }, []);
  
  // Form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);
      
      // Validate form data
      if (!title || !startDate || !startTime || !endDate || !endTime) {
        throw new Error('Please fill in all required fields');
      }
      
      // Create start and end datetime objects
      const startDateTime = new Date(`${startDate}T${startTime}`);
      const endDateTime = new Date(`${endDate}T${endTime}`);
      
      // Validate dates
      if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
        throw new Error('Invalid date or time format');
      }
      
      if (endDateTime <= startDateTime) {
        throw new Error('End time must be after start time');
      }
      
      // Check if online and Microsoft account is connected
      if (isOnline && !hasMicrosoftAuth) {
        throw new Error('You must connect your Microsoft account to create online sessions');
      }
      
      // Prepare session data
      const sessionData = {
        title,
        description,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        location: isOnline ? null : location,
        is_online: isOnline,
        course_id: courseId || null
      };
      
      // Call API to create session
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sessionData),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to create session');
      }
      
      // Check for Teams error
      if (result.teamsError) {
        setError(`Session created, but Teams meeting creation failed: ${result.teamsError}`);
        setSuccess(true);
      } else {
        setSuccess(true);
        // Redirect to session details or list after a short delay
        setTimeout(() => {
          router.push('/dashboard/sessions');
        }, 2000);
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Create CME Session</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push('/dashboard/sessions')} className="px-4">
            Discard
          </Button>
          <Button 
            type="submit" 
            form="session-form"
            disabled={loading || (isOnline && hasMicrosoftAuth === false)}
            className="px-4"
          >
            {loading ? 'Creating...' : 'Create Session'}
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Session Details */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Session Details</CardTitle>
            </CardHeader>
            <CardContent>
              <form id="session-form" onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="title">Name</Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Session Title"
                      required
                      className="mt-1"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="course">Course</Label>
                      <select
                        id="course"
                        value={courseId}
                        onChange={(e) => setCourseId(e.target.value)}
                        className="w-full p-2 border rounded-md mt-1"
                      >
                        <option value="">Select a course</option>
                        {courses.map((course) => (
                          <option key={course.id} value={course.id}>
                            {course.title}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="description">Description (Optional)</Label>
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Session Description"
                      rows={4}
                      className="mt-1"
                    />
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>
          
          {/* Session Schedule */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Session Schedule</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="startDate">Start Date</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      required
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="startTime">Start Time</Label>
                    <Input
                      id="startTime"
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      required
                      className="mt-1"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="endDate">End Date</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      required
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="endTime">End Time</Label>
                    <Input
                      id="endTime"
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      required
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Location Type */}
          <Card>
            <CardHeader>
              <CardTitle>Location</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2 py-2">
                <Switch
                  id="isOnline"
                  checked={isOnline}
                  onCheckedChange={setIsOnline}
                />
                <Label htmlFor="isOnline">Online Session (Microsoft Teams)</Label>
              </div>
              
              {isOnline && !checkingAuth && (
                <>
                  {hasMicrosoftAuth === false && (
                    <Alert className="bg-yellow-50 border-yellow-200 mt-4">
                      <div className="flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-500"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                        <AlertTitle>Microsoft Account Not Connected</AlertTitle>
                      </div>
                      <AlertDescription>
                        You need to connect your Microsoft account to create Teams meetings.
                        <Button 
                          variant="link" 
                          onClick={() => router.push('/dashboard/microsoft-connect')}
                          className="p-0 h-auto font-normal text-blue-600 hover:text-blue-800"
                        >
                          Connect Microsoft Account
                        </Button>
                      </AlertDescription>
                    </Alert>
                  )}
                  {hasMicrosoftAuth === true && (
                    <Alert className="bg-green-50 border-green-200 mt-4">
                      <div className="flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                        <AlertTitle>Microsoft Account Connected</AlertTitle>
                      </div>
                      <AlertDescription>
                        Your Microsoft account is connected. Teams meetings will be created automatically.
                      </AlertDescription>
                    </Alert>
                  )}
                </>
              )}
              
              {!isOnline && (
                <div className="mt-4">
                  <Label htmlFor="location">Physical Location</Label>
                  <Input
                    id="location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Enter location"
                    className="mt-1"
                  />
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Status Messages */}
          {(error || success) && (
            <Card>
              <CardHeader>
                <CardTitle>Status</CardTitle>
              </CardHeader>
              <CardContent>
                {error && (
                  <Alert className="bg-red-50 border-red-200">
                    <div className="flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                      <AlertTitle>Error</AlertTitle>
                    </div>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                
                {success && (
                  <Alert className="bg-green-50 border-green-200">
                    <div className="flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                      <AlertTitle>Success</AlertTitle>
                    </div>
                    <AlertDescription>Session created successfully!</AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
