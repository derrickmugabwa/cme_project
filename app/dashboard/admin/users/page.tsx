'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingPage, LoadingSpinner } from '@/components/ui/loading-spinner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Search, UserPlus, Filter } from 'lucide-react';
import toast from 'react-hot-toast';

interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  created_at: string;
  title?: string;
  institution?: string;
  professional_cadre?: string;
  disabled?: boolean;
}

export default function UserManagementPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string | null>(null);

  useEffect(() => {
    async function fetchUsers() {
      try {
        setLoading(true);
        const supabase = createClient();
        
        // Check if current user is admin
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push('/dashboard');
          return;
        }
        
        const { data: currentUser, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();
        
        if (profileError || !currentUser || currentUser.role !== 'admin') {
          router.push('/dashboard');
          return;
        }
        
        // Fetch all users
        const { data: userData, error: userError } = await supabase
          .from('profiles')
          .select('id, email, full_name, role, created_at, title, institution, professional_cadre, disabled')
          .order('created_at', { ascending: false });
        
        if (userError) {
          throw userError;
        }
        
        setUsers(userData || []);
        setFilteredUsers(userData || []);
      } catch (error: any) {
        console.error('Error fetching users:', error);
        setError(error.message || 'An error occurred while fetching users');
      } finally {
        setLoading(false);
      }
    }
    
    fetchUsers();
  }, [router]);
  
  // Filter users based on search query and role filter
  useEffect(() => {
    let result = [...users];
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(user => 
        user.full_name?.toLowerCase().includes(query) ||
        user.email?.toLowerCase().includes(query) ||
        user.institution?.toLowerCase().includes(query)
      );
    }
    
    // Apply role filter
    if (roleFilter) {
      result = result.filter(user => user.role === roleFilter);
    }
    
    setFilteredUsers(result);
  }, [users, searchQuery, roleFilter]);
  
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };
  
  const handleRoleFilter = (role: string | null) => {
    setRoleFilter(role);
  };
  
  const handleEditUser = (userId: string) => {
    router.push(`/dashboard/admin/users/${userId}`);
  };
  
  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800 hover:bg-red-200';
      case 'faculty':
        return 'bg-blue-100 text-blue-800 hover:bg-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
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
            <Button onClick={() => window.location.reload()}>Try Again</Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">User Management</h1>
        <Button onClick={() => router.push('/dashboard/admin/users/new')}>
          <UserPlus className="h-4 w-4 mr-2" />
          Add User
        </Button>
      </div>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>
            Manage user accounts and roles
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search users..."
                className="pl-8"
                value={searchQuery}
                onChange={handleSearch}
              />
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Filter className="h-4 w-4 mr-2" />
                  {roleFilter ? `Role: ${roleFilter}` : 'Filter by Role'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Filter by Role</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleRoleFilter(null)}>
                  All Roles
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleRoleFilter('admin')}>
                  Admin
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleRoleFilter('faculty')}>
                  Faculty
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleRoleFilter('user')}>
                  User
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Institution</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-6 text-gray-500">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center">
                          {user.disabled && (
                            <span className="inline-block w-2 h-2 rounded-full bg-red-500 mr-2" title="Account disabled"></span>
                          )}
                          <span className={user.disabled ? "text-gray-400" : ""}>
                            {user.full_name || 'No name'}
                            {user.title && <span className="text-gray-500 ml-1">{user.title}</span>}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge className={getRoleBadgeStyle(user.role)}>
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>{user.institution || '-'}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleEditUser(user.id)}>
                              Edit User
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={async () => {
                                try {
                                  const response = await fetch('/api/admin/users/reset-password', {
                                    method: 'POST',
                                    headers: {
                                      'Content-Type': 'application/json',
                                    },
                                    body: JSON.stringify({
                                      userId: user.id,
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
                              className="text-blue-600"
                            >
                              Reset Password
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={async () => {
                                try {
                                  const response = await fetch('/api/admin/users/toggle-status', {
                                    method: 'POST',
                                    headers: {
                                      'Content-Type': 'application/json',
                                    },
                                    body: JSON.stringify({
                                      userId: user.id,
                                      disabled: !user.disabled,
                                    }),
                                  });
                                  
                                  const data = await response.json();
                                  
                                  if (!response.ok) {
                                    throw new Error(data.error || 'Failed to update account status');
                                  }
                                  
                                  // Update the user in the list
                                  setUsers(prevUsers => 
                                    prevUsers.map(u => 
                                      u.id === user.id ? { ...u, disabled: !u.disabled } : u
                                    )
                                  );
                                  
                                  toast.success(data.message || 'Account status updated');
                                } catch (error: any) {
                                  console.error('Error updating account status:', error);
                                  toast.error(error.message || 'Failed to update account status');
                                }
                              }}
                              className={user.disabled ? "text-green-600" : "text-red-600"}
                            >
                              {user.disabled ? 'Enable Account' : 'Disable Account'}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          
          <div className="mt-4 text-sm text-gray-500">
            Showing {filteredUsers.length} of {users.length} users
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
