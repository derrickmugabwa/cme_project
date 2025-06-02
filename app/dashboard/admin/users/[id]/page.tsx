'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/client';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingPage } from '@/components/ui/loading-spinner';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save, UserCog } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  created_at: string;
  updated_at?: string;
  title?: string;
  institution?: string;
  professional_cadre?: string;
  country?: string;
  registration_number?: string;
  professional_board?: string;
  phone_number?: string;
  accepted_terms?: boolean;
  disabled?: boolean;
}

export default function UserEditPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const { id } = resolvedParams;
  const isNewUser = id === 'new';
  
  // Add state for password fields when creating a new user
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>('user');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  
  // Form state
  const [formData, setFormData] = useState<Partial<User>>({});
  
  useEffect(() => {
    async function fetchUserData() {
      try {
        setLoading(true);
        
        // If it's a new user, initialize with empty form
        if (isNewUser) {
          setUser(null);
          setFormData({
            full_name: '',
            email: '',
            title: '',
            institution: '',
            professional_cadre: '',
            country: '',
            registration_number: '',
            professional_board: '',
            phone_number: '',
          });
          setSelectedRole('user');
          setLoading(false);
          return;
        }
        
        // Fetch existing user data
        const supabase = createClient();
        const { data: user, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', id)
          .single();

        if (error) {
          console.error('Error fetching user:', error);
          toast.error('Failed to load user data');
          router.push('/dashboard/admin/users');
          return;
        }

        setUser(user);
        setFormData({
          full_name: user.full_name || '',
          email: user.email || '',
          title: user.title || '',
          institution: user.institution || '',
          professional_cadre: user.professional_cadre || '',
          country: user.country || '',
          registration_number: user.registration_number || '',
          professional_board: user.professional_board || '',
          phone_number: user.phone_number || '',
        });
        setSelectedRole(user.role || 'user');
      } catch (error) {
        console.error('Error in fetchUser:', error);
        toast.error('An error occurred while loading user data');
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [id, router, isNewUser]);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleRoleChange = (value: string) => {
    setFormData(prev => ({ ...prev, role: value }));
  };
  
  const handleSave = async () => {
    try {
      setSaving(true);
      const supabase = createClient();
      
      // Validate form data
      if (!formData.email || !formData.full_name) {
        toast.error('Email and full name are required');
        setSaving(false);
        return;
      }
      
      if (isNewUser) {
        // Validate password for new users
        if (!password) {
          setPasswordError('Password is required');
          toast.error('Password is required');
          setSaving(false);
          return;
        }
        
        if (password !== confirmPassword) {
          setPasswordError('Passwords do not match');
          toast.error('Passwords do not match');
          setSaving(false);
          return;
        }
        
        if (password.length < 8) {
          setPasswordError('Password must be at least 8 characters');
          toast.error('Password must be at least 8 characters');
          setSaving(false);
          return;
        }
        
        // Create new user via API
        const response = await fetch('/api/admin/users', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: formData.email,
            password,
            userData: {
              ...formData,
              role: selectedRole,
            },
          }),
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to create user');
        }
        
        toast.success(data.message || 'User created successfully');
        toast.success('A confirmation email has been sent to the user');
        router.push('/dashboard/admin/users');
      } else {
        // Update existing user
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            full_name: formData.full_name,
            title: formData.title,
            role: formData.role,
            institution: formData.institution,
            professional_cadre: formData.professional_cadre,
            country: formData.country,
            registration_number: formData.registration_number,
            professional_board: formData.professional_board,
            phone_number: formData.phone_number,
            updated_at: new Date().toISOString()
          })
          .eq('id', id);
        
        if (updateError) {
          throw updateError;
        }
        
        toast.success('User updated successfully');
        router.push('/dashboard/admin/users');
      }
    } catch (error: any) {
      console.error('Error saving user:', error);
      toast.error(error.message || 'An error occurred while saving user data');
    } finally {
      setSaving(false);
    }
  };
  
  if (loading) {
    return <LoadingPage />;
  }
  
  if (error) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">Error</CardTitle>
            <CardDescription>
              {error}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/dashboard/admin/users')}>Back to Users</Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center mb-6">
        <Button variant="ghost" onClick={() => router.push('/dashboard/admin/users')} className="mr-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">
          {isNewUser ? 'Add New User' : 'Edit User'}
        </h1>
      </div>
      
      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList>
          <TabsTrigger value="profile">Profile Information</TabsTrigger>
          <TabsTrigger value="role">Role & Permissions</TabsTrigger>
          {!isNewUser && <TabsTrigger value="account">Account Actions</TabsTrigger>}
        </TabsList>
        
        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Profile</CardTitle>
              <CardDescription>
                Update the user's profile information
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Full Name</Label>
                    <Input
                      id="full_name"
                      name="full_name"
                      value={formData.full_name || ''}
                      onChange={handleInputChange}
                      placeholder="Enter full name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email || ''}
                      onChange={handleInputChange}
                      placeholder="Enter email address"
                    />
                  </div>
                </div>
                
                {/* Password fields for new user */}
                {isNewUser && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        name="password"
                        type="password"
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          if (passwordError) setPasswordError('');
                        }}
                        placeholder="Enter password"
                      />
                      {passwordError && (
                        <p className="text-sm text-red-500 mt-1">{passwordError}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm Password</Label>
                      <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => {
                          setConfirmPassword(e.target.value);
                          if (passwordError) setPasswordError('');
                        }}
                        placeholder="Confirm password"
                      />
                    </div>
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    name="title"
                    value={formData.title || ''}
                    onChange={handleInputChange}
                    placeholder="e.g. Dr., Prof."
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phone_number">Phone Number</Label>
                  <Input
                    id="phone_number"
                    name="phone_number"
                    value={formData.phone_number || ''}
                    onChange={handleInputChange}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="institution">Institution</Label>
                  <Input
                    id="institution"
                    name="institution"
                    value={formData.institution || ''}
                    onChange={handleInputChange}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    name="country"
                    value={formData.country || ''}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="professional_cadre">Professional Cadre</Label>
                  <Input
                    id="professional_cadre"
                    name="professional_cadre"
                    value={formData.professional_cadre || ''}
                    onChange={handleInputChange}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="professional_board">Professional Board</Label>
                  <Input
                    id="professional_board"
                    name="professional_board"
                    value={formData.professional_board || ''}
                    onChange={handleInputChange}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="registration_number">Registration Number</Label>
                  <Input
                    id="registration_number"
                    name="registration_number"
                    value={formData.registration_number || ''}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
              
              {!isNewUser && user && (
                <div className="pt-4 text-sm text-gray-500">
                  <p>User ID: {user.id}</p>
                  <p>Created: {format(new Date(user.created_at), 'PPP')}</p>
                  {user.updated_at && (
                    <p>Last Updated: {format(new Date(user.updated_at), 'PPP')}</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="role" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Role</CardTitle>
              <CardDescription>
                Manage the user's role and access permissions
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select 
                  value={formData.role || 'user'} 
                  onValueChange={handleRoleChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="faculty">Faculty</SelectItem>
                    <SelectItem value="user">User</SelectItem>
                  </SelectContent>
                </Select>
                
                <div className="mt-4">
                  <h3 className="text-sm font-medium mb-2">Role Description:</h3>
                  {formData.role === 'admin' && (
                    <div className="bg-red-50 p-3 rounded-md border border-red-100">
                      <Badge className="bg-red-100 text-red-800 mb-2">Admin</Badge>
                      <p className="text-sm text-gray-700">
                        Full access to all system features, including user management, content management, and system settings.
                      </p>
                    </div>
                  )}
                  {formData.role === 'faculty' && (
                    <div className="bg-blue-50 p-3 rounded-md border border-blue-100">
                      <Badge className="bg-blue-100 text-blue-800 mb-2">Faculty</Badge>
                      <p className="text-sm text-gray-700">
                        Can create and manage webinars, approve attendance, and access limited administrative features.
                      </p>
                    </div>
                  )}
                  {formData.role === 'user' && (
                    <div className="bg-gray-50 p-3 rounded-md border border-gray-100">
                      <Badge className="bg-gray-100 text-gray-800 mb-2">User</Badge>
                      <p className="text-sm text-gray-700">
                        Standard user with access to educational content, webinars, and personal attendance records.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {!isNewUser && (
          <TabsContent value="account" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Account Actions</CardTitle>
                <CardDescription>
                  Manage account status and security settings
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-6">
                {/* Password Reset Section */}
                <div className="border-b pb-6">
                  <h3 className="text-lg font-medium mb-2">Password Reset</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Reset the user's password by sending a reset link or setting a new password directly.
                  </p>
                  
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium mb-2">Option 1: Send Reset Link</h4>
                      <Button
                        variant="outline"
                        onClick={async () => {
                          try {
                            const response = await fetch('/api/admin/users/reset-password', {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                              },
                              body: JSON.stringify({
                                userId: id,
                                sendEmail: true,
                              }),
                            });
                            
                            const data = await response.json();
                            
                            if (!response.ok) {
                              throw new Error(data.error || 'Failed to send password reset');
                            }
                            
                            toast.success(data.message || 'Password reset email sent');
                          } catch (error: any) {
                            console.error('Error sending password reset:', error);
                            toast.error(error.message || 'Failed to send password reset');
                          }
                        }}
                      >
                        Send Password Reset Link
                      </Button>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium mb-2">Option 2: Set New Password</h4>
                      <div className="grid gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="new-password">New Password</Label>
                          <Input
                            id="new-password"
                            type="password"
                            placeholder="Enter new password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="confirm-password">Confirm Password</Label>
                          <Input
                            id="confirm-password"
                            type="password"
                            placeholder="Confirm new password"
                            value={confirmNewPassword}
                            onChange={(e) => setConfirmNewPassword(e.target.value)}
                          />
                          {newPassword && confirmNewPassword && newPassword !== confirmNewPassword && (
                            <p className="text-sm text-red-500">Passwords do not match</p>
                          )}
                        </div>
                        <Button
                          variant="default"
                          disabled={!newPassword || newPassword !== confirmNewPassword || newPassword.length < 6}
                          onClick={async () => {
                            try {
                              const response = await fetch('/api/admin/users/reset-password', {
                                method: 'POST',
                                headers: {
                                  'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({
                                  userId: id,
                                  newPassword,
                                }),
                              });
                              
                              const data = await response.json();
                              
                              if (!response.ok) {
                                throw new Error(data.error || 'Failed to reset password');
                              }
                              
                              // Clear the password fields
                              setNewPassword('');
                              setConfirmNewPassword('');
                              
                              toast.success(data.message || 'Password has been reset successfully');
                            } catch (error: any) {
                              console.error('Error resetting password:', error);
                              toast.error(error.message || 'Failed to reset password');
                            }
                          }}
                        >
                          Reset Password
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Account Status Section */}
                <div>
                  <h3 className="text-lg font-medium mb-2">Account Status</h3>
                  <div className="flex items-center mb-4">
                    <div className="mr-3">
                      <Badge className={user?.disabled ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}>
                        {user?.disabled ? 'Disabled' : 'Active'}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600">
                      {user?.disabled 
                        ? 'This account is currently disabled. The user cannot log in.' 
                        : 'This account is currently active and can be used to log in.'}
                    </p>
                  </div>
                  
                  <Button
                    variant={user?.disabled ? "default" : "destructive"}
                    onClick={async () => {
                      try {
                        const response = await fetch('/api/admin/users/toggle-status', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({
                            userId: id,
                            disabled: !user?.disabled,
                          }),
                        });
                        
                        const data = await response.json();
                        
                        if (!response.ok) {
                          throw new Error(data.error || 'Failed to update account status');
                        }
                        
                        // Update the local user state to reflect the change
                        setUser(prev => prev ? {...prev, disabled: !prev.disabled} : null);
                        
                        toast.success(data.message || 'Account status updated');
                      } catch (error: any) {
                        console.error('Error updating account status:', error);
                        toast.error(error.message || 'Failed to update account status');
                      }
                    }}
                  >
                    {user?.disabled ? 'Enable Account' : 'Disable Account'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
      
      <div className="mt-6 flex justify-end">
        <Button 
          variant="outline" 
          onClick={() => router.push('/dashboard/admin/users')} 
          className="mr-2"
        >
          Cancel
        </Button>
        <Button 
          onClick={handleSave} 
          disabled={saving}
        >
          {saving ? (
            <>
              <span className="mr-2">Saving...</span>
              <span className="animate-spin">⟳</span>
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
