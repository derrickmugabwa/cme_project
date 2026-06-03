"use client";

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Toaster } from '@/components/ui/toaster';
import { Calendar, Clock, MessageSquare, Video } from 'lucide-react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import MediaManager from '@/components/sessions/MediaManager';
import { SessionMedia } from '@/types/session-media';
import QuestionManager, { DraftQuestion } from '@/components/sessions/QuestionManager';

export default function EditSessionPage({ params }: { params: Promise<{ id: string }> }) {
  // Store the ID in a variable to avoid direct access warnings
  const [sessionId, setSessionId] = useState<string>('');
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  
  // State for Microsoft authentication
  const [hasMicrosoftAuth, setHasMicrosoftAuth] = useState<boolean | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  
  // Form state
  const [title, setTitle] = useState('');
  const [topic, setTopic] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');
  const [isOnline, setIsOnline] = useState(false);
  const [wasOnline, setWasOnline] = useState(false); // Track if session was originally online
  const [location, setLocation] = useState('');
  const [courseId, setCourseId] = useState('');
  const [teamsJoinUrl, setTeamsJoinUrl] = useState('');
  const [onlineProvider, setOnlineProvider] = useState<'teams' | 'zoom' | 'google-meet'>('teams');
  const [manualMeetingLink, setManualMeetingLink] = useState('');
  const [useManualLink, setUseManualLink] = useState(false);
  
  // UI state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  // Media state
  const [sessionMedia, setSessionMedia] = useState<SessionMedia[]>([]);
  
  // Questions state
  const [initialQuestions, setInitialQuestions] = useState<DraftQuestion[]>([]);
  
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
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          throw new Error('You must be signed in to edit webinars');
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (profile?.role !== 'admin') {
          throw new Error('Only admins can edit webinars');
        }

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
        setTopic(session.topic || '');
        setDescription(session.description || '');
        setCourseId(session.course_id || '');
        setLocation(session.location || '');
        setIsOnline(session.is_online || false);
        setWasOnline(session.is_online || false);
        setTeamsJoinUrl(session.teams_join_url || '');
        setOnlineProvider(session.online_provider || 'teams');
        setManualMeetingLink(session.teams_join_url || '');
        setUseManualLink(!!session.teams_join_url && (session.online_provider !== 'teams' || !session.teams_meeting_id));
        
        // Format dates for form inputs
        const startDateTime = new Date(session.start_time);
        const endDateTime = new Date(session.end_time);
        
        setStartDate(startDateTime.toISOString().split('T')[0]);
        setStartTime(startDateTime.toISOString().split('T')[1].substring(0, 5));
        setEndDate(endDateTime.toISOString().split('T')[0]);
        setEndTime(endDateTime.toISOString().split('T')[1].substring(0, 5));
        
        // Check Microsoft auth status
        const { data: msToken } = await supabase
          .from('ms_graph_tokens')
          .select('id')
          .eq('profile_id', user.id)
          .single();
        
        setHasMicrosoftAuth(!!msToken);
      } catch (error: unknown) {
        console.error('Error loading session data:', error);
        setError(error instanceof Error ? error.message : 'Failed to load session data');
      } finally {
        setLoading(false);
        setCheckingAuth(false);
      }
    }
    
    loadSessionData();
  }, [sessionId, supabase]);

  // Load existing questions for this session
  useEffect(() => {
    if (!sessionId) return;
    async function loadQuestions() {
      try {
        const res = await fetch(`/api/sessions/${sessionId}/questions`);
        if (!res.ok) return;
        const data = await res.json();
        const questions = (data.questions ?? []) as DraftQuestion[];
        setInitialQuestions(
          questions.map((q) => ({
            id: q.id,
            question_text: q.question_text,
            question_order: q.question_order,
            question_type: q.question_type || 'free_text',
            options: q.options || undefined,
            correct_answer: q.correct_answer || undefined,
          }))
        );
      } catch {
        // non-fatal
      }
    }
    loadQuestions();
  }, [sessionId]);
  
  // Form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      setError(null);
      
      // Validate form data
      if (!title || !topic || !startDate || !startTime || !endDate || !endTime) {
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
      
      // Check if online and provider is Teams and Microsoft account is connected
      if (isOnline && onlineProvider === 'teams' && !hasMicrosoftAuth && !useManualLink) {
        throw new Error('You must connect your Microsoft account or add a meeting link manually to update Teams webinars');
      }

      if (isOnline && useManualLink && !manualMeetingLink) {
        throw new Error(`Please enter a ${onlineProvider === 'teams' ? 'Teams' : onlineProvider === 'zoom' ? 'Zoom' : 'Google Meet'} meeting link`);
      }

      if (isOnline && useManualLink && manualMeetingLink) {
        if (onlineProvider === 'teams' && !manualMeetingLink.includes('teams.microsoft.com')) {
          throw new Error('Please enter a valid Microsoft Teams meeting link');
        } else if (onlineProvider === 'zoom' && !manualMeetingLink.includes('zoom.us')) {
          throw new Error('Please enter a valid Zoom meeting link');
        } else if (onlineProvider === 'google-meet' && !manualMeetingLink.includes('meet.google.com')) {
          throw new Error('Please enter a valid Google Meet link');
        }
      }
      
      // Prepare session data
      const sessionData = {
        title,
        topic,
        description,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        location: isOnline ? null : location,
        is_online: isOnline,
        course_id: courseId || null,
        online_provider: isOnline ? onlineProvider : null,
        teams_join_url: isOnline && useManualLink ? manualMeetingLink : null
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
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Failed to update session');
    } finally {
      setSaving(false);
    }
  };
  
  if (loading) {
    return <p>Loading session data...</p>;
  }

  if (error) {
    return (
      <div className="container mx-auto py-6">
        <Alert className="bg-red-50 border-red-200 mb-4">
          <AlertTitle>Unable to Edit Webinar</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button
          variant="outline"
          onClick={() => router.push(sessionId ? `/dashboard/sessions/${sessionId}` : '/dashboard/sessions')}
        >
          Back to Webinar
        </Button>
      </div>
    );
  }

  const selectedStartDateTime = startDate && startTime ? new Date(`${startDate}T${startTime}`) : null;
  const selectedEndDateTime = endDate && endTime ? new Date(`${endDate}T${endTime}`) : null;

  const updateStartDateTime = (date: Date | null) => {
    if (!date) {
      setStartDate('');
      setStartTime('');
      return;
    }

    setStartDate(date.toISOString().split('T')[0]);
    setStartTime(date.toTimeString().slice(0, 5));

    if (!selectedEndDateTime || selectedEndDateTime <= date) {
      const nextEndDate = new Date(date.getTime() + 60 * 60 * 1000);
      setEndDate(nextEndDate.toISOString().split('T')[0]);
      setEndTime(nextEndDate.toTimeString().slice(0, 5));
    }
  };

  const updateEndDateTime = (date: Date | null) => {
    if (!date) {
      setEndDate('');
      setEndTime('');
      return;
    }

    setEndDate(date.toISOString().split('T')[0]);
    setEndTime(date.toTimeString().slice(0, 5));
  };
  
  return (
    <div className="container mx-auto py-6">
      <Toaster />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Edit Webinar</h1>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(`/dashboard/sessions/${sessionId}`)}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="session-form"
            disabled={saving || (isOnline && onlineProvider === 'teams' && hasMicrosoftAuth === false && !useManualLink)}
            className="px-4 bg-[#008C45] hover:bg-[#006633] text-white"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Webinar Details</CardTitle>
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
                      placeholder="Webinar Title"
                      required
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="topic">Topic *</Label>
                    <Input
                      id="topic"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      required
                      className="mt-1"
                    />
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

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Webinar Schedule</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <Label htmlFor="startDateTime">Start Date & Time</Label>
                  <div className="relative mt-1">
                    <div className="flex items-center border rounded-md overflow-hidden">
                      <div className="flex-grow">
                        <DatePicker
                          id="startDateTime"
                          selected={selectedStartDateTime}
                          onChange={updateStartDateTime}
                          showTimeSelect
                          timeFormat="HH:mm"
                          timeIntervals={15}
                          dateFormat="MMMM d, yyyy h:mm aa"
                          placeholderText="Select start date and time"
                          className="w-full p-2 border-0 focus:ring-0 focus:outline-none"
                          required
                        />
                      </div>
                      <div className="p-2 bg-gray-50 border-l">
                        <Calendar className="h-5 w-5 text-gray-500" />
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="endDateTime">End Date & Time</Label>
                  <div className="relative mt-1">
                    <div className="flex items-center border rounded-md overflow-hidden">
                      <div className="flex-grow">
                        <DatePicker
                          id="endDateTime"
                          selected={selectedEndDateTime}
                          onChange={updateEndDateTime}
                          showTimeSelect
                          timeFormat="HH:mm"
                          timeIntervals={15}
                          dateFormat="MMMM d, yyyy h:mm aa"
                          placeholderText="Select end date and time"
                          className="w-full p-2 border-0 focus:ring-0 focus:outline-none"
                          required
                          minDate={selectedStartDateTime || undefined}
                          disabled={!selectedStartDateTime}
                        />
                      </div>
                      <div className="p-2 bg-gray-50 border-l">
                        <Clock className="h-5 w-5 text-gray-500" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1 space-y-6">
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
                <Label htmlFor="isOnline">Online Webinar</Label>
              </div>

              {isOnline && (
                <div className="mt-4">
                  <Label className="mb-2 block">Select Online Meeting Provider</Label>
                  <div className="grid grid-cols-3 gap-3 mt-2">
                    <div
                      onClick={() => setOnlineProvider('teams')}
                      className={`flex flex-col items-center justify-center p-3 rounded-lg cursor-pointer border-2 transition-all ${onlineProvider === 'teams' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
                    >
                      <div className="w-12 h-12 bg-[#4b53bc] text-white rounded-md flex items-center justify-center mb-2">
                        <Video className="w-6 h-6" />
                      </div>
                      <span className="text-sm font-medium">Teams</span>
                      <span className="text-xs text-gray-500 invisible">Placeholder</span>
                    </div>

                    <div
                      onClick={() => {
                        setOnlineProvider('zoom');
                        setUseManualLink(true);
                      }}
                      className={`flex flex-col items-center justify-center p-3 rounded-lg cursor-pointer border-2 transition-all ${onlineProvider === 'zoom' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
                    >
                      <div className="w-12 h-12 bg-[#2d8cff] text-white rounded-md flex items-center justify-center mb-2">
                        <Video className="w-6 h-6" />
                      </div>
                      <span className="text-sm font-medium">Zoom</span>
                    </div>

                    <div
                      onClick={() => {
                        setOnlineProvider('google-meet');
                        setUseManualLink(true);
                      }}
                      className={`flex flex-col items-center justify-center p-3 rounded-lg cursor-pointer border-2 transition-all ${onlineProvider === 'google-meet' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
                    >
                      <div className="w-12 h-12 bg-[#00897b] text-white rounded-md flex items-center justify-center mb-2">
                        <MessageSquare className="w-6 h-6" />
                      </div>
                      <span className="text-sm font-medium">Google Meet</span>
                    </div>
                  </div>
                </div>
              )}

              {isOnline && onlineProvider === 'teams' && !checkingAuth && (
                <>
                  {hasMicrosoftAuth === false && (
                    <div className="space-y-4 mt-4">
                      <Alert className="bg-yellow-50 border-yellow-200">
                        <AlertTitle>Microsoft Account Not Connected</AlertTitle>
                        <AlertDescription>
                          <p className="mb-2">You need to connect your Microsoft account to automatically update Teams meetings.</p>
                          <Button
                            variant="link"
                            onClick={() => router.push('/dashboard/microsoft-connect')}
                            className="p-0 h-auto font-normal text-blue-600 hover:text-blue-800"
                          >
                            Connect Microsoft Account
                          </Button>
                        </AlertDescription>
                      </Alert>

                      <div className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center space-x-2 mb-4">
                          <Switch
                            id="useManualLink"
                            checked={useManualLink}
                            onCheckedChange={setUseManualLink}
                          />
                          <Label htmlFor="useManualLink">Add meeting link manually</Label>
                        </div>

                        {useManualLink && (
                          <div>
                            <Label htmlFor="manualMeetingLink">Teams Meeting Link</Label>
                            <Input
                              id="manualMeetingLink"
                              value={manualMeetingLink}
                              onChange={(e) => setManualMeetingLink(e.target.value)}
                              placeholder="https://teams.microsoft.com/l/meetup-join/..."
                              className="mt-1"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              Enter a valid Microsoft Teams meeting link. This will be used for attendees to join the webinar.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {hasMicrosoftAuth === true && (
                    <div className="space-y-4 mt-4">
                      <Alert className="bg-green-50 border-green-200">
                        <AlertTitle>Microsoft Account Connected</AlertTitle>
                        <AlertDescription>
                          Your Microsoft account is connected. Teams meeting details will be updated automatically unless you use a manual link.
                        </AlertDescription>
                      </Alert>

                      <div className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center space-x-2 mb-4">
                          <Switch
                            id="useManualLink"
                            checked={useManualLink}
                            onCheckedChange={setUseManualLink}
                          />
                          <Label htmlFor="useManualLink">Add meeting link manually</Label>
                        </div>

                        {useManualLink && (
                          <div>
                            <Label htmlFor="manualMeetingLink">Teams Meeting Link</Label>
                            <Input
                              id="manualMeetingLink"
                              value={manualMeetingLink}
                              onChange={(e) => setManualMeetingLink(e.target.value)}
                              placeholder="https://teams.microsoft.com/l/meetup-join/..."
                              className="mt-1"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              Enter a valid Microsoft Teams meeting link. This will be used for attendees to join the webinar.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}

              {isOnline && (onlineProvider === 'zoom' || onlineProvider === 'google-meet') && (
                <div className="space-y-4 mt-4">
                  <Alert className="bg-blue-50 border-blue-200">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-blue-500" />
                      <AlertTitle>{onlineProvider === 'zoom' ? 'Zoom' : 'Google Meet'} Integration</AlertTitle>
                    </div>
                    <AlertDescription>
                      <p className="mb-2">{onlineProvider === 'zoom' ? 'Zoom' : 'Google Meet'} integration will be available soon. For now, add the meeting link manually.</p>
                    </AlertDescription>
                  </Alert>

                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-4">
                      <Switch
                        id="useManualLink"
                        checked={useManualLink}
                        onCheckedChange={setUseManualLink}
                      />
                      <Label htmlFor="useManualLink">Add meeting link manually</Label>
                    </div>

                    {useManualLink && (
                      <div>
                        <Label htmlFor="manualMeetingLink">{onlineProvider === 'zoom' ? 'Zoom' : 'Google Meet'} Meeting Link</Label>
                        <Input
                          id="manualMeetingLink"
                          value={manualMeetingLink}
                          onChange={(e) => setManualMeetingLink(e.target.value)}
                          placeholder={onlineProvider === 'zoom' ? 'https://zoom.us/j/...' : 'https://meet.google.com/...'}
                          className="mt-1"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Enter a valid {onlineProvider === 'zoom' ? 'Zoom' : 'Google Meet'} meeting link. This will be used for attendees to join the webinar.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {isOnline && onlineProvider === 'teams' && wasOnline && teamsJoinUrl && (
                <Alert className="bg-blue-50 border-blue-200 mt-4">
                  <AlertTitle>Existing Teams Meeting</AlertTitle>
                  <AlertDescription>
                    This webinar already has a Teams meeting. The meeting details will be updated with your changes.
                  </AlertDescription>
                </Alert>
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

          {success && (
            <Alert className="bg-green-50 border-green-200">
              <AlertTitle>Success</AlertTitle>
              <AlertDescription>Session updated successfully!</AlertDescription>
            </Alert>
          )}
        </div>

        {sessionId && (
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Webinar Questions</CardTitle>
              </CardHeader>
              <CardContent>
                <QuestionManager
                  sessionId={sessionId}
                  initialQuestions={initialQuestions}
                />
              </CardContent>
            </Card>
          </div>
        )}

        {sessionId && (
          <div className="lg:col-span-1">
            <Card>
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
          </div>
        )}
      </div>
    </div>
  );
}
