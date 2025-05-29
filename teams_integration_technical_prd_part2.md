## 5. Frontend Implementation

### 5.1 Microsoft Connection Component

```tsx
// microsoft-connection-status.tsx
export function MicrosoftConnectionStatus() {
  const searchParams = useSearchParams()
  const { showNotification } = useNotification()
  
  useEffect(() => {
    // Check for Microsoft connection status in URL
    const microsoftConnected = searchParams.get('microsoft_connected')
    const error = searchParams.get('error')
    
    // Handle success
    if (microsoftConnected === 'true') {
      showNotification(
        'success', 
        'Microsoft account connected successfully! You can now create Teams meetings.'
      )
    }
    
    // Handle various error types
    if (error) {
      let errorMessage = 'Failed to connect Microsoft account. Please try again.'
      
      switch (error) {
        case 'microsoft_auth_failed':
          errorMessage = 'Microsoft authentication failed. Please try again.'
          break
        case 'token_exchange_failed':
          errorMessage = 'Failed to get Microsoft access tokens. Please try again.'
          break
        // Additional error cases...
      }
      
      showNotification('error', errorMessage)
    }
    
    // Remove query parameters from URL
    if (microsoftConnected || error) {
      const newUrl = window.location.pathname
      window.history.replaceState({}, '', newUrl)
    }
  }, [searchParams, showNotification])
  
  return null
}
```

### 5.2 Microsoft Connect Page

```tsx
// microsoft-connect/page.tsx
export default function MicrosoftConnectPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [checkingConnection, setCheckingConnection] = useState(true)
  
  // Check connection status
  useEffect(() => {
    async function checkMicrosoftConnection() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          setCheckingConnection(false)
          return
        }
        
        // Check if user has Microsoft Graph tokens
        const { data } = await supabase
          .from('ms_graph_tokens')
          .select('*')
          .eq('profile_id', user.id)
          .single()
        
        if (data) {
          setIsConnected(true)
          
          // Check if token is expired
          const expiresAt = new Date(data.expires_at)
          const now = new Date()
          
          if (expiresAt <= now) {
            console.log('Token is expired, expires at:', expiresAt.toISOString())
          }
          
          // Check for placeholder refresh token
          if (data.refresh_token === 'pending_refresh_token') {
            setError('Microsoft authentication incomplete. Please reconnect your account.')
          }
        } else {
          setIsConnected(false)
          setError('Microsoft account not connected')
        }
      } catch (error) {
        console.error('Error checking Microsoft connection:', error)
      } finally {
        setCheckingConnection(false)
      }
    }
    
    checkMicrosoftConnection()
  }, [supabase])
  
  // Connect to Microsoft
  const handleConnect = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Call API to initiate Microsoft OAuth
      const response = await fetch('/api/auth/microsoft')
      const { authUrl } = await response.json()
      
      // Redirect to Microsoft login
      window.location.href = authUrl
    } catch (error: any) {
      setError(error.message || 'Failed to connect to Microsoft')
      setLoading(false)
    }
  }
  
  // Render UI with connection status and connect button
}
```

### 5.3 Session Creation with Teams Integration

```tsx
// sessions/create/page.tsx
export default function CreateSessionPage() {
  // State for Microsoft authentication
  const [hasMicrosoftAuth, setHasMicrosoftAuth] = useState<boolean | null>(null)
  
  // Form state
  const [title, setTitle] = useState('')
  const [startDate, setStartDate] = useState<Date | undefined>(undefined)
  const [endDate, setEndDate] = useState<Date | undefined>(undefined)
  const [isOnline, setIsOnline] = useState(false)
  const [location, setLocation] = useState('')
  
  // Check Microsoft auth status
  useEffect(() => {
    async function checkMicrosoftAuth() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          setHasMicrosoftAuth(false)
          return
        }
        
        // Check if user has Microsoft Graph tokens
        const { data } = await supabase
          .from('ms_graph_tokens')
          .select('id')
          .eq('profile_id', user.id)
          .single()
        
        setHasMicrosoftAuth(!!data)
      } catch (error) {
        console.error('Error checking Microsoft auth:', error)
        setHasMicrosoftAuth(false)
      }
    }
    
    checkMicrosoftAuth()
  }, [supabase])
  
  // Form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      // Validate form data
      if (!startDate || !endDate) {
        throw new Error('Please select both start and end dates')
      }
      
      // Prepare session data
      const sessionData = {
        title,
        description,
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
        location: isOnline ? null : location,
        is_online: isOnline
      }
      
      // Call API to create session
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sessionData),
      })
      
      const result = await response.json()
      
      // Handle Teams error
      if (result.teams_error && isOnline) {
        toast({
          title: "Session created with warning",
          description: result.teams_error,
          variant: "destructive"
        })
      } else {
        toast({
          title: "Session created successfully",
          description: isOnline && result.teams_join_url
            ? "Your session with Microsoft Teams integration has been created."
            : "Your session has been created successfully."
        })
      }
      
      // Redirect to session details
      router.push(`/dashboard/sessions/${result.id}`)
    } catch (error: any) {
      console.error('Error creating session:', error)
      setFormError(error.message || 'Failed to create session')
    }
  }
  
  // Render form with Teams integration options
}
```

## 6. API Endpoints

### 6.1 Microsoft Authentication Endpoints

```typescript
// /api/auth/microsoft
// Initiates Microsoft OAuth flow

// /api/auth/microsoft/callback
// Handles OAuth callback and token storage

// /api/auth/microsoft/status
// Checks Microsoft authentication status
```

### 6.2 Session Management Endpoints

```typescript
// /api/sessions
// POST: Create a new session with Teams integration
// GET: List sessions

// /api/sessions/[id]
// GET: Get session details
// PUT: Update session and Teams meeting
// DELETE: Delete session and Teams meeting
```

### 6.3 Attendance Management Endpoints

```typescript
// /api/attendance
// POST: Record attendance

// /api/attendance/sync
// POST: Sync attendance with Teams meeting data
```

## 7. Implementation Workflow

### 7.1 Authentication Flow

1. User navigates to Microsoft Connect page
2. User clicks "Connect Microsoft Account" button
3. System initiates OAuth flow with Microsoft
4. User authenticates with Microsoft and grants permissions
5. Microsoft redirects back to callback URL
6. System exchanges authorization code for access and refresh tokens
7. Tokens are stored in the database
8. User is redirected to Microsoft Connect page with success message

### 7.2 Session Creation Flow

1. User navigates to Create Session page
2. System checks if user has Microsoft authentication
3. User fills out session details and toggles "Online Session" option
4. If online session is selected, Teams meeting options are displayed
5. User submits the form
6. System creates the session in the database
7. If online session is selected, system creates a Teams meeting
8. Teams meeting details are stored with the session
9. User is redirected to session details page

### 7.3 Attendance Tracking Flow

1. Session occurs via Teams meeting
2. After session, faculty can sync attendance data
3. System retrieves attendance report from Teams API
4. Attendance data is processed and stored in the database
5. Faculty can view attendance report with Teams verification

## 8. Error Handling and Edge Cases

### 8.1 Token Refresh Mechanism

- System checks token expiration before each API call
- Buffer time (5 minutes) is used to proactively refresh tokens
- If refresh fails, user is prompted to reconnect their Microsoft account

### 8.2 Missing Refresh Token

- Microsoft sometimes doesn't return refresh tokens on first auth
- System uses 'offline_access' scope to ensure refresh tokens are received
- If refresh token is missing, system redirects to authorization with explicit offline_access scope

### 8.3 Teams Meeting Creation Failures

- If Teams meeting creation fails, session is still created
- Error message is stored in teams_error column
- User is shown a warning notification
- Session can be edited later to retry Teams meeting creation

## 9. Security Considerations

### 9.1 Token Storage

- Tokens are stored securely in the database
- Row-Level Security (RLS) ensures users can only access their own tokens
- Access tokens are never exposed to the client

### 9.2 Permission Scopes

- Only necessary Microsoft Graph API scopes are requested
- Scopes are explicitly listed in the authorization request

### 9.3 Error Logging

- Sensitive information is redacted from logs
- Only token presence is logged, not the actual token values

## 10. Dependencies

```json
"dependencies": {
  "@microsoft/microsoft-graph-client": "^3.0.0",
  "@supabase/supabase-js": "^2.0.0",
  "next": "^13.0.0",
  "react": "^18.0.0",
  "react-dom": "^18.0.0",
  "date-fns": "^2.30.0"
}
```
