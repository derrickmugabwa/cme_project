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
import { Video, MessageSquare, Calendar, Clock } from 'lucide-react';
import DatePicker from 'react-datepicker';
import { format, setHours, setMinutes, addHours } from 'date-fns';
import 'react-datepicker/dist/react-datepicker.css';
import { useToast } from '@/components/ui/use-toast';
import { Toaster } from '@/components/ui/toaster';
import MediaUploadZone from '@/components/sessions/MediaUploadZone';
import { SessionMedia } from '@/types/session-media';

// Supabase client will be initialized in the component

export default function CreateSessionPage() {
  const router = useRouter();
  const { toast } = useToast();
  
  // State for Microsoft authentication
  const [hasMicrosoftAuth, setHasMicrosoftAuth] = useState<boolean | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDateTime, setStartDateTime] = useState<Date | null>(null);
  const [endDateTime, setEndDateTime] = useState<Date | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [location, setLocation] = useState('');
  const [onlineProvider, setOnlineProvider] = useState<'teams' | 'zoom' | 'google-meet'>('teams');
  const [manualMeetingLink, setManualMeetingLink] = useState('');
  const [useManualLink, setUseManualLink] = useState(false);
  
  // UI state
  const [loading, setLoading] = useState(false);
  
  // Media state
  const [sessionMedia, setSessionMedia] = useState<SessionMedia[]>([]);
  
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
            toast({
              variant: "destructive",
              title: "Microsoft Authentication Error",
              description: "Microsoft token is expired. Please reconnect your account."
            });
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
    
    checkMicrosoftAuth();
  }, []);
  
  // Form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      // Validate form data
      if (!title || !startDateTime || !endDateTime) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Please fill in all required fields"
        });
        return;
      }
      
      // Validate dates
      if (endDateTime <= startDateTime) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "End time must be after start time"
        });
        return;
      }
      
      // Check if online and provider is Teams and Microsoft account is connected
      if (isOnline && onlineProvider === 'teams' && !hasMicrosoftAuth && !useManualLink) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "You must connect your Microsoft account or add a meeting link manually to create Teams webinars"
        });
        return;
      }
      
      // Validate manual meeting link if provided
      if (isOnline && useManualLink && !manualMeetingLink) {
        toast({
          variant: "destructive",
          title: "Error",
          description: `Please enter a ${onlineProvider === 'teams' ? 'Teams' : onlineProvider === 'zoom' ? 'Zoom' : 'Google Meet'} meeting link`
        });
        return;
      }
      
      // Validate manual meeting link format if provided
      if (isOnline && useManualLink && manualMeetingLink) {
        // Validate link format based on provider
        if (onlineProvider === 'teams' && !manualMeetingLink.includes('teams.microsoft.com')) {
          toast({
            variant: "destructive",
            title: "Error",
            description: "Please enter a valid Microsoft Teams meeting link"
          });
          return;
        } else if (onlineProvider === 'zoom' && !manualMeetingLink.includes('zoom.us')) {
          toast({
            variant: "destructive",
            title: "Error",
            description: "Please enter a valid Zoom meeting link"
          });
          return;
        } else if (onlineProvider === 'google-meet' && !manualMeetingLink.includes('meet.google.com')) {
          toast({
            variant: "destructive",
            title: "Error",
            description: "Please enter a valid Google Meet link"
          });
          return;
        }
      }
      
      // Prepare base session data
      const baseSessionData = {
        title,
        description,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        location: isOnline ? null : location,
        is_online: isOnline
      };
      
      let response;
      
      // Use different API endpoints based on the selected provider
      if (isOnline) {
        if (onlineProvider === 'teams') {
          if (useManualLink) {
            // For Teams meetings with manual link
            const teamsManualSessionData = {
              ...baseSessionData,
              teams_join_url: manualMeetingLink
            };
            
            // Call Teams manual API endpoint
            response = await fetch('/api/sessions/teams-manual', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(teamsManualSessionData),
            });
          } else {
            // For Teams meetings with integration
            const teamsSessionData = {
              ...baseSessionData,
              online_provider: 'teams'
            };
            
            // Call Teams API endpoint with integration
            response = await fetch('/api/sessions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(teamsSessionData),
            });
          }
        } 
        else if (onlineProvider === 'zoom') {
          // For Zoom meetings
          const zoomSessionData = {
            ...baseSessionData,
            zoom_join_url: manualMeetingLink
          };
          
          // Call Zoom API endpoint
          response = await fetch('/api/sessions/zoom', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(zoomSessionData),
          });
        } 
        else if (onlineProvider === 'google-meet') {
          // For Google Meet meetings
          const googleMeetSessionData = {
            ...baseSessionData,
            google_meet_url: manualMeetingLink
          };
          
          // Call Google Meet API endpoint
          response = await fetch('/api/sessions/google-meet', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(googleMeetSessionData),
          });
        }
      } else {
        // For in-person sessions
        response = await fetch('/api/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(baseSessionData),
        });
      }
        
        // Check if response is defined before using it
        if (!response) {
          toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to create webinar - no response received"
          });
          return;
        }
        
        const result = await response.json();
        
        if (!response.ok) {
          toast({
            variant: "destructive",
            title: "Error",
            description: result.error || "Failed to create webinar"
          });
          return;
        }
        
        // Upload media files if any were staged
        if (sessionMedia.length > 0 && result.session?.id) {
          console.log(`Uploading ${sessionMedia.length} media files for session ${result.session.id}`);
          
          try {
            const uploadPromises = sessionMedia.map(async (media) => {
              // Only upload preview files (those with _file property)
              if (media._file) {
                const formData = new FormData();
                formData.append('file', media._file);
                formData.append('fileType', media.file_type);
                formData.append('displayOrder', media.display_order.toString());

                const uploadResponse = await fetch(`/api/sessions/${result.session.id}/media`, {
                  method: 'POST',
                  body: formData,
                });

                if (!uploadResponse.ok) {
                  const errorData = await uploadResponse.json();
                  console.error('Media upload failed:', errorData);
                  return null;
                }

                const uploadResult = await uploadResponse.json();
                return uploadResult.media;
              }
              return null;
            });

            const uploadResults = await Promise.all(uploadPromises);
            const successfulUploads = uploadResults.filter(result => result !== null);
            
            console.log(`Successfully uploaded ${successfulUploads.length} out of ${sessionMedia.length} media files`);
          } catch (mediaError) {
            console.error('Error uploading media files:', mediaError);
            // Don't fail the entire process if media upload fails
          }
        }
        
        // Check for Teams error
        if (result.teamsError) {
          toast({
            variant: "default",
            title: "Webinar Created",
            description: `Webinar created, but Teams meeting creation failed: ${result.teamsError}`
          });
        } else {
          const mediaMessage = sessionMedia.length > 0 ? ` with ${sessionMedia.length} media files` : '';
          toast({
            title: "Success",
            description: `Webinar created successfully${mediaMessage}!`
          });
        }
        
        // Redirect to session list
        router.push('/dashboard/sessions');
    } catch (error: any) {
      console.error('Error creating session:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "An unexpected error occurred"
      });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="container mx-auto py-6">
      <Toaster />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Create Webinar</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push('/dashboard/sessions')} className="px-4">
            Discard
          </Button>
          <Button 
            type="submit" 
            form="session-form"
            disabled={loading || (isOnline && onlineProvider === 'teams' && hasMicrosoftAuth === false && !useManualLink)}
            className="px-4"
          >
            {loading ? 'Creating...' : 'Create Webinar'}
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Webinar Details */}
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
                  
                  {/* Course selection removed */}
                  
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
                          selected={startDateTime}
                          onChange={(date) => {
                            setStartDateTime(date);
                            // If end date is not set or is before start date, set it to start date + 1 hour
                            if (!endDateTime || (date && endDateTime < date)) {
                              setEndDateTime(date ? addHours(date, 1) : null);
                            }
                          }}
                          showTimeSelect
                          timeFormat="HH:mm"
                          timeIntervals={15}
                          dateFormat="MMMM d, yyyy h:mm aa"
                          placeholderText="Select start date and time"
                          className="w-full p-2 border-0 focus:ring-0 focus:outline-none"
                          required
                          minDate={new Date()}
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
                          selected={endDateTime}
                          onChange={(date) => setEndDateTime(date)}
                          showTimeSelect
                          timeFormat="HH:mm"
                          timeIntervals={15}
                          dateFormat="MMMM d, yyyy h:mm aa"
                          placeholderText="Select end date and time"
                          className="w-full p-2 border-0 focus:ring-0 focus:outline-none"
                          required
                          minDate={startDateTime || new Date()}
                          disabled={!startDateTime}
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
        
        {/* Right Sidebar */}
        <div className="lg:col-span-1 space-y-6">
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
                      onClick={() => setOnlineProvider('zoom')}
                      className={`flex flex-col items-center justify-center p-3 rounded-lg cursor-pointer border-2 transition-all ${onlineProvider === 'zoom' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
                    >
                      <div className="w-12 h-12 bg-[#2d8cff] text-white rounded-md flex items-center justify-center mb-2">
                        <Video className="w-6 h-6" />
                      </div>
                      <span className="text-sm font-medium">Zoom</span>
                      <span className="text-xs text-gray-500">(Coming Soon)</span>
                    </div>
                    
                    <div 
                      onClick={() => setOnlineProvider('google-meet')}
                      className={`flex flex-col items-center justify-center p-3 rounded-lg cursor-pointer border-2 transition-all ${onlineProvider === 'google-meet' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
                    >
                      <div className="w-12 h-12 bg-[#00897b] text-white rounded-md flex items-center justify-center mb-2">
                        <MessageSquare className="w-6 h-6" />
                      </div>
                      <span className="text-sm font-medium">Google Meet</span>
                      <span className="text-xs text-gray-500">(Coming Soon)</span>
                    </div>
                  </div>
                </div>
              )}
              
              {isOnline && onlineProvider === 'teams' && !checkingAuth && (
                <>
                  {hasMicrosoftAuth === false && (
                    <div className="space-y-4 mt-4">
                      <Alert className="bg-yellow-50 border-yellow-200">
                        <div className="flex items-center gap-2">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-500"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                          <AlertTitle>Microsoft Account Not Connected</AlertTitle>
                        </div>
                        <AlertDescription>
                          <p className="mb-2">You need to connect your Microsoft account to automatically create Teams meetings.</p>
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
              
              {isOnline && (onlineProvider === 'zoom' || onlineProvider === 'google-meet') && (
                <div className="space-y-4 mt-4">
                  <Alert className="bg-blue-50 border-blue-200">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-blue-500" />
                      <AlertTitle>{onlineProvider === 'zoom' ? 'Zoom' : 'Google Meet'} Integration</AlertTitle>
                    </div>
                    <AlertDescription>
                      <p className="mb-2">{onlineProvider === 'zoom' ? 'Zoom' : 'Google Meet'} integration will be available soon. For now, you can add the meeting link manually.</p>
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
                          placeholder={onlineProvider === 'zoom' ? "https://zoom.us/j/..." : "https://meet.google.com/..."}
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
        </div>

        {/* Media Upload Section */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Session Media</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Upload videos and images for your webinar. You can add trailers, promotional content, and visual materials.
              </p>
              <MediaUploadZone
                onFilesUploaded={(files) => setSessionMedia(prev => [...prev, ...files])}
                maxFiles={10}
                disabled={loading}
              />
              
              {sessionMedia.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-medium text-gray-900 mb-2">
                    Uploaded Files ({sessionMedia.length})
                  </h4>
                  <div className="space-y-2">
                    {sessionMedia.map((media, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm">
                            {media.file_type === 'video' ? '🎥' : '🖼️'}
                          </span>
                          <span className="text-sm font-medium">{media.file_name}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSessionMedia(prev => prev.filter((_, i) => i !== index))}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Toast notifications will appear here */}
        </div>
      </div>
    </div>
  );
}
