"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import MediaManager from '@/components/sessions/MediaManager';
import { SessionMedia } from '@/types/session-media';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface Session {
  id: string;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  location: string;
  is_online: boolean;
  course_id: string;
  teams_join_url: string;
  teams_meeting_id: string;
  teams_error: string;
}

export default function EditSessionPage({ params }: { params: Promise<{ id: string }> }) {
  // Store the ID in a variable to avoid direct access warnings
  const [sessionId, setSessionId] = useState<string>('');
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
  const [wasOnline, setWasOnline] = useState(false); // Track if session was originally online
  const [location, setLocation] = useState('');
  const [courseId, setCourseId] = useState('');
  const [courses, setCourses] = useState<any[]>([]);
  const [teamsJoinUrl, setTeamsJoinUrl] = useState('');
  
  // UI state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  // Media state
  const [sessionMedia, setSessionMedia] = useState<SessionMedia[]>([]);
  
  // Extract session ID from params
  useEffect(() => {
    const getSessionId = async () => {
      try {
        const { id } = await params;
        setSessionId(id);
      } catch (error) {
        console.error('Error extracting session ID:', error);
        setError('Error loading session data');
      }
    };
    
    getSessionId();
  }, [params]);

  // Load session data
  useEffect(() => {
    if (!sessionId) return; // Don't load data until we have the session ID
    async function loadSessionData() {
      try {
        // Fetch session details
        const { data: session, error: sessionError } = await supabase
          .from('sessions')
          .select('*')
          .eq('id', sessionId)
          .single();
        
        if (sessionError) {
          throw sessionError;
        }
        
        if (!session) {
          throw new Error('Session not found');
        }
        
        // Set form data from session
        setTitle(session.title || '');
        setDescription(session.description || '');
        setCourseId(session.course_id || '');
        setLocation(session.location || '');
        setIsOnline(session.is_online || false);
        setWasOnline(session.is_online || false);
        setTeamsJoinUrl(session.teams_join_url || '');
        
        // Format dates for form inputs
        const startDateTime = new Date(session.start_time);
        const endDateTime = new Date(session.end_time);
        
        setStartDate(startDateTime.toISOString().split('T')[0]);
        setStartTime(startDateTime.toISOString().split('T')[1].substring(0, 5));
        setEndDate(endDateTime.toISOString().split('T')[0]);
        setEndTime(endDateTime.toISOString().split('T')[1].substring(0, 5));
        
        // Load courses
        const { data: coursesData } = await supabase
          .from('courses')
          .select('id, title')
          .eq('is_active', true);
        
        if (coursesData) {
          setCourses(coursesData);
        }
        
        // Check Microsoft auth status
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          const { data: msToken } = await supabase
            .from('ms_graph_tokens')
            .select('id')
            .eq('profile_id', user.id)
            .single();
          
          setHasMicrosoftAuth(!!msToken);
        } else {
          setHasMicrosoftAuth(false);
        }
      } catch (error: any) {
        console.error('Error loading session data:', error);
        setError(error.message);
      } finally {
        setLoading(false);
        setCheckingAuth(false);
      }
    }
    
    loadSessionData();
  }, [sessionId]);
  
  // Form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setSaving(true);
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
      
      // Call API to update session
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sessionData),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to update session');
      }
      
      // Check for Teams error
      if (result.teamsError) {
        setError(`Session updated, but Teams meeting update failed: ${result.teamsError}`);
        setSuccess(true);
      } else {
        setSuccess(true);
        // Redirect to session details after a short delay
        setTimeout(() => {
          router.push(`/dashboard/sessions/${sessionId}`);
        }, 2000);
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setSaving(false);
    }
  };
  
  if (loading) {
    return <p>Loading session data...</p>;
  }
  
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Edit Session</h1>
      
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Session Details</CardTitle>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Session Title"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Session Description"
                rows={3}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date *</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="startTime">Start Time *</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date *</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="endTime">End Time *</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="course">Course (Optional)</Label>
              <select
                id="course"
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                className="w-full p-2 border rounded-md"
              >
                <option value="">Select a course</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.title}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex items-center space-x-2 py-2">
              <Switch
                id="isOnline"
                checked={isOnline}
                onCheckedChange={setIsOnline}
              />
              <Label htmlFor="isOnline">Online Session (Microsoft Teams)</Label>
            </div>
            
            {isOnline && !hasMicrosoftAuth && !checkingAuth && (
              <Alert className="bg-yellow-50 border-yellow-200">
                <AlertTitle>Microsoft Account Not Connected</AlertTitle>
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
            
            {isOnline && wasOnline && teamsJoinUrl && (
              <Alert className="bg-blue-50 border-blue-200">
                <AlertTitle>Existing Teams Meeting</AlertTitle>
                <AlertDescription>
                  This session already has a Teams meeting. The meeting details will be updated with your changes.
                </AlertDescription>
              </Alert>
            )}
            
            {!isOnline && (
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Physical Location"
                />
              </div>
            )}
            
            {error && (
              <Alert className="bg-red-50 border-red-200">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            {success && (
              <Alert className="bg-green-50 border-green-200">
                <AlertTitle>Success</AlertTitle>
                <AlertDescription>Session updated successfully!</AlertDescription>
              </Alert>
            )}
            
            <CardFooter className="px-0 pt-4">
              <div className="flex space-x-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => router.push(`/dashboard/sessions/${sessionId}`)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={saving || (isOnline && !hasMicrosoftAuth)}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </CardFooter>
          </form>
        </CardContent>
      </Card>

      {/* Media Management Section */}
      {sessionId && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Session Media</CardTitle>
          </CardHeader>
          <CardContent>
            <MediaManager
              sessionId={sessionId}
              initialMedia={sessionMedia}
              onChange={setSessionMedia}
              canEdit={true}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
