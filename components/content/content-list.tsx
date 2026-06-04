'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/components/ui/use-toast'
import { Download, FileText, Film, Music, Image as ImageIcon, File, Presentation, Search, ChevronLeft, ChevronRight } from 'lucide-react'

interface ContentListProps {
  userId: string
  userRole: string
}

interface Department {
  id: string
  name: string
}

interface ContentItem {
  id: string
  title: string
  description: string | null
  file_path: string
  file_size: number
  content_type: string
  department_id: string | null
  organisation_id: string | null
  download_count: number | null
  profiles?: { full_name: string | null } | null
  courses?: { title: string | null } | null
  departments?: { name: string | null } | null
  organisations?: { name: string | null } | null
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

export function ContentList({ userId, userRole }: ContentListProps) {
  const [content, setContent] = useState<ContentItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [contentTypeFilter, setContentTypeFilter] = useState<string>('')
  const [departmentFilter, setDepartmentFilter] = useState<string>('')
  const [departments, setDepartments] = useState<Department[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  
  const supabase = createClient()
  
  useEffect(() => {
    const fetchContent = async () => {
      setIsLoading(true)
      
      try {
        // First, check if there's any content at all
        const { data: allContent, error: checkError } = await supabase
          .from('educational_content')
          .select('id')
        
        if (checkError) {
          throw new Error(`Error checking content: ${checkError.message}`)
        }
        
        // If no content exists, we'll just show an empty state
        // Disabled automatic seeding since it requires SUPABASE_SERVICE_ROLE_KEY
        if (!allContent || allContent.length === 0) {
          console.log('No content found, showing empty state')
          // Removed: await seedTestContent()
        }
        
        console.log('Content check:', { exists: allContent && allContent.length > 0, userRole })
        
        // Main query with proper filtering
        let query = supabase
          .from('educational_content')
          .select(`
            *,
            profiles:faculty_id(full_name),
            courses:course_id(title),
            departments:department_id(name),
            organisations:organisation_id(name)
          `)
        
        // Apply role-based filtering
        if (userRole === 'faculty') {
          // Faculty can see their own content
          query = query.eq('faculty_id', userId)
        } else if (userRole === 'user') {
          // Students can see all published content
          query = query.eq('is_published', true)
        }
        // Admin will see all content
        
        const { data, error } = await query
        
        if (error) {
          throw new Error(`Error fetching content: ${error.message}`)
        }
        
        console.log('Content query results:', { 
          count: data?.length || 0, 
          userRole,
          firstItem: data && data.length > 0 ? data[0] : null
        })
        
        setContent(data || [])
      } catch (error: unknown) {
        console.error('Error:', error)
        toast({
          title: 'Error',
          description: getErrorMessage(error, 'Error fetching content'),
          variant: 'destructive'
        })
      } finally {
        setIsLoading(false)
      }
    }
    
    const fetchDepartments = async () => {
      try {
        const { data, error } = await supabase
          .from('departments')
          .select('*')
        
        if (error) {
          throw new Error(`Error fetching departments: ${error.message}`)
        }
        
        setDepartments(data || [])
      } catch (error: unknown) {
        console.error('Error:', error)
      }
    }
    
    fetchContent()
    fetchDepartments()
  }, [supabase, userId, userRole])
  
  const filteredContent = useMemo(() => {
    let filtered = [...content]
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(item => 
        item.title.toLowerCase().includes(query) || 
        (item.description && item.description.toLowerCase().includes(query))
      )
    }
    
    if (contentTypeFilter && contentTypeFilter !== 'all_types') {
      filtered = filtered.filter(item => item.content_type === contentTypeFilter)
    }
    
    if (departmentFilter && departmentFilter !== 'all_departments') {
      filtered = filtered.filter(item => item.department_id === departmentFilter)
    }
    
    return filtered
  }, [content, searchQuery, contentTypeFilter, departmentFilter])

  const totalPages = Math.max(1, Math.ceil(filteredContent.length / pageSize))
  const activePage = Math.min(currentPage, totalPages)
  const paginatedContent = useMemo(() => {
    const startIndex = (activePage - 1) * pageSize
    return filteredContent.slice(startIndex, startIndex + pageSize)
  }, [filteredContent, activePage, pageSize])

  const handleFilterChange = (setter: (value: string) => void) => (value: string) => {
    setter(value)
    setCurrentPage(1)
  }

  const handlePageSizeChange = (value: string) => {
    setPageSize(parseInt(value, 10))
    setCurrentPage(1)
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(Math.min(Math.max(page, 1), totalPages))
  }
  
  const getContentTypeIcon = (type: string) => {
    switch (type) {
      case 'pdf':
        return <FileText className="h-5 w-5 text-red-500" />
      case 'ppt':
        return <Presentation className="h-5 w-5 text-orange-500" />
      case 'doc':
        return <FileText className="h-5 w-5 text-blue-500" />
      case 'audio':
        return <Music className="h-5 w-5 text-purple-500" />
      case 'video':
        return <Film className="h-5 w-5 text-pink-500" />
      case 'image':
        return <ImageIcon className="h-5 w-5 text-green-500" />
      default:
        return <File className="h-5 w-5 text-gray-500" />
    }
  }
  
  const handleDownload = async (contentItem: ContentItem) => {
    try {
      // 1. Get download URL
      const { data, error } = await supabase.storage
        .from('content')
        .createSignedUrl(contentItem.file_path, 60) // URL valid for 60 seconds
      
      if (error) {
        throw new Error(`Error creating download URL: ${error.message}`)
      }
      
      // 2. Record the download access
      await supabase
        .from('content_access')
        .insert({
          content_id: contentItem.id,
          user_id: userId,
          access_type: 'download'
        })
      
      // 3. Trigger download
      window.open(data.signedUrl, '_blank')
      
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description: getErrorMessage(error, 'Error creating download URL'),
        variant: 'destructive'
      })
    }
  }
  
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    else if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    else return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }
  
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle>Educational Content</CardTitle>
            <CardDescription>
              {userRole === 'faculty' ? 'Manage your uploaded educational materials' : 'Access educational materials for your courses'}
            </CardDescription>
          </div>
          
          {(userRole === 'faculty' || userRole === 'admin') && (
            <Button asChild className="bg-[#008C45] hover:bg-[#006633] text-white">
              <a href="/dashboard/content/upload">Upload New Content</a>
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search content..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setCurrentPage(1)
                }}
              />
            </div>
            
            <div className="flex flex-col md:flex-row gap-2">
              <Select value={contentTypeFilter} onValueChange={handleFilterChange(setContentTypeFilter)}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_types">All Types</SelectItem>
                  <SelectItem value="pdf">PDF Documents</SelectItem>
                  <SelectItem value="ppt">Presentations</SelectItem>
                  <SelectItem value="doc">Documents</SelectItem>
                  <SelectItem value="audio">Audio</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                  <SelectItem value="image">Images</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={departmentFilter} onValueChange={handleFilterChange(setDepartmentFilter)}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Filter by department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_departments">All Departments</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredContent.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
              <h3 className="mt-4 text-lg font-medium">No content found</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {userRole === 'faculty' 
                  ? 'Upload educational content to share with your students.' 
                  : 'No educational content is available for your courses.'}
              </p>
            </div>
          ) : (
            <div className="border rounded-md divide-y">
              {paginatedContent.map((item) => (
                <div key={item.id} className="p-4 hover:bg-muted/50">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                      <div className="mt-0.5">
                        {getContentTypeIcon(item.content_type)}
                      </div>
                      <div>
                        <h3 className="font-medium">{item.title}</h3>
                        {item.description && (
                          <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                        )}
                        <div className="flex flex-wrap gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">
                            {item.content_type.toUpperCase()}
                          </Badge>
                          {item.courses && (
                            <Badge variant="secondary" className="text-xs">
                              {item.courses.title || 'No Course'}
                            </Badge>
                          )}
                          {item.departments && (
                            <Badge variant="secondary" className="text-xs">
                              {item.departments.name || 'No Department'}
                            </Badge>
                          )}
                          <Badge variant={item.organisation_id ? 'secondary' : 'outline'} className="text-xs">
                            {item.organisations?.name || 'All organisations'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span>Size: {formatFileSize(item.file_size)}</span>
                          <span>Uploaded by: {item.profiles?.full_name || 'Unknown'}</span>
                          <span>Downloads: {item.download_count || 0}</span>
                        </div>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleDownload(item)}
                      className="flex-shrink-0 border-[#008C45]/30 text-[#008C45] hover:bg-green-50"
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!isLoading && filteredContent.length > 0 && (
            <div className="flex flex-col gap-4 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-muted-foreground">
                Showing {((activePage - 1) * pageSize) + 1} to {Math.min(activePage * pageSize, filteredContent.length)} of {filteredContent.length} content items
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Show:</span>
                  <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
                    <SelectTrigger className="w-20 border-[#008C45]/30 focus:ring-[#008C45]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(activePage - 1)}
                      disabled={activePage === 1}
                      className="border-[#008C45]/30 text-[#008C45] hover:bg-green-50"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      <span className="hidden sm:inline">Previous</span>
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, index) => index + 1)
                        .filter((page) => page === 1 || page === totalPages || Math.abs(page - activePage) <= 1)
                        .map((page, index, pages) => {
                          const showEllipsis = index > 0 && page - pages[index - 1] > 1

                          return (
                            <div key={page} className="flex items-center">
                              {showEllipsis && <span className="px-2 text-sm text-muted-foreground">...</span>}
                              <Button
                                variant={activePage === page ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => handlePageChange(page)}
                                className={`h-8 w-8 p-0 ${
                                  activePage === page
                                    ? 'bg-[#008C45] text-white hover:bg-[#006633]'
                                    : 'border-[#008C45]/30 text-[#008C45] hover:bg-green-50'
                                }`}
                              >
                                {page}
                              </Button>
                            </div>
                          )
                        })}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(activePage + 1)}
                      disabled={activePage === totalPages}
                      className="border-[#008C45]/30 text-[#008C45] hover:bg-green-50"
                    >
                      <span className="hidden sm:inline">Next</span>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
