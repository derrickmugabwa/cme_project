'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/client'
import { Button } from '@/components/ui/button'
import { Card as BaseCard, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

// Custom Card component with rounded corners
const Card = ({ className, ...props }: React.ComponentProps<typeof BaseCard>) => (
  <BaseCard className={`rounded-2xl overflow-hidden shadow-sm ${className || ''}`} {...props} />
)

// Custom themed Button variants
const PrimaryButton = ({ className, ...props }: React.ComponentProps<typeof Button>) => (
  <Button className={`bg-blue-600 hover:bg-blue-700 text-white rounded-xl ${className || ''}`} {...props} />
)

const SecondaryButton = ({ className, ...props }: React.ComponentProps<typeof Button>) => (
  <Button variant="outline" className={`border-gray-300 hover:bg-gray-100 rounded-xl ${className || ''}`} {...props} />
)

const SuccessButton = ({ className, ...props }: React.ComponentProps<typeof Button>) => (
  <Button className={`bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl ${className || ''}`} {...props} />
)
import { Input as BaseInput } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea as BaseTextarea } from '@/components/ui/textarea'
import { Select as BaseSelect, SelectContent, SelectItem, SelectTrigger as BaseSelectTrigger, SelectValue } from '@/components/ui/select'

// Custom Select Trigger with rounded corners
const SelectTrigger = ({ className, ...props }: React.ComponentProps<typeof BaseSelectTrigger>) => (
  <BaseSelectTrigger className={`rounded-xl border-gray-300 focus:ring-blue-500 ${className || ''}`} {...props} />
)

// Wrapper for Select to use our custom trigger
const Select = ({ children, ...props }: React.ComponentProps<typeof BaseSelect>) => (
  <BaseSelect {...props}>{children}</BaseSelect>
)

// Custom Input with rounded corners
const Input = ({ className, ...props }: React.ComponentProps<typeof BaseInput>) => (
  <BaseInput className={`rounded-xl border-gray-300 focus:border-blue-500 focus:ring-blue-500 ${className || ''}`} {...props} />
)

// Custom Textarea with rounded corners
const Textarea = ({ className, ...props }: React.ComponentProps<typeof BaseTextarea>) => (
  <BaseTextarea className={`rounded-xl border-gray-300 focus:border-blue-500 focus:ring-blue-500 ${className || ''}`} {...props} />
)
import { toast } from '@/components/ui/use-toast'
import { Upload, File, X } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface UploadContentFormProps {
  userId: string
}

export function UploadContentForm({ userId }: UploadContentFormProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [contentType, setContentType] = useState<string>('')
  const [courseId, setCourseId] = useState<string>('')
  const [departmentId, setDepartmentId] = useState<string>('')
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [courses, setCourses] = useState<any[]>([])
  const [departments, setDepartments] = useState<any[]>([])
  
  const router = useRouter()
  const supabase = createClient()
  
  // Fetch courses taught by the faculty
  useEffect(() => {
    const fetchCourses = async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('faculty_id', userId)
        .eq('is_active', true)
      
      if (error) {
        console.error('Error fetching courses:', error)
        return
      }
      
      setCourses(data || [])
    }
    
    const fetchDepartments = async () => {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
      
      if (error) {
        console.error('Error fetching departments:', error)
        return
      }
      
      setDepartments(data || [])
    }
    
    fetchCourses()
    fetchDepartments()
  }, [supabase, userId])
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]
      setFile(selectedFile)
      
      // Auto-detect content type from file extension
      const extension = selectedFile.name.split('.').pop()?.toLowerCase()
      if (extension) {
        if (['pdf'].includes(extension)) setContentType('pdf')
        else if (['ppt', 'pptx'].includes(extension)) setContentType('ppt')
        else if (['doc', 'docx'].includes(extension)) setContentType('doc')
        else if (['mp3', 'wav', 'ogg'].includes(extension)) setContentType('audio')
        else if (['mp4', 'mov', 'avi', 'webm'].includes(extension)) setContentType('video')
        else if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension)) setContentType('image')
        else setContentType('other')
      }
    }
  }
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!file) {
      toast({
        title: 'Error',
        description: 'Please select a file to upload',
        variant: 'destructive'
      })
      return
    }
    
    if (!title) {
      toast({
        title: 'Error',
        description: 'Please enter a title for the content',
        variant: 'destructive'
      })
      return
    }
    
    if (!contentType) {
      toast({
        title: 'Error',
        description: 'Please select a content type',
        variant: 'destructive'
      })
      return
    }
    
    setIsUploading(true)
    
    try {
      // 1. Upload file to Supabase Storage
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Math.random().toString(36).substring(2, 15)}.${fileExt}`
      const filePath = `${userId}/${fileName}`
      
      const { error: uploadError } = await supabase.storage
        .from('content')
        .upload(filePath, file)
      
      if (uploadError) {
        throw new Error(`Error uploading file: ${uploadError.message}`)
      }
      
      // 2. Create record in educational_content table
      const { error: dbError } = await supabase
        .from('educational_content')
        .insert({
          title,
          description,
          file_path: filePath,
          file_name: file.name,
          file_size: file.size,
          content_type: contentType,
          faculty_id: userId,
          course_id: courseId && courseId !== 'none' ? courseId : null,
          department_id: departmentId && departmentId !== 'none' ? departmentId : null,
          is_published: true
        })
      
      if (dbError) {
        throw new Error(`Error saving content record: ${dbError.message}`)
      }
      
      toast({
        title: 'Success',
        description: 'Educational content uploaded successfully',
      })
      
      // Reset form
      setTitle('')
      setDescription('')
      setContentType('')
      setCourseId('')
      setDepartmentId('')
      setFile(null)
      
      // Redirect to content list
      router.push('/dashboard/content')
      router.refresh()
      
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      })
    } finally {
      setIsUploading(false)
    }
  }
  
  const handleSave = async () => {
    if (!title) {
      toast({
        title: "Error",
        description: "Please enter a title for the content",
        variant: "destructive"
      })
      return
    }
    
    if (!file) {
      toast({
        title: "Error",
        description: "Please select a file to upload",
        variant: "destructive"
      })
      return
    }
    
    setIsUploading(true)
    
    try {
      // 1. Upload file to Supabase Storage
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Math.random().toString(36).substring(2, 15)}.${fileExt}`
      const filePath = `${userId}/${fileName}`
      
      const { error: uploadError } = await supabase.storage
        .from('content')
        .upload(filePath, file)
      
      if (uploadError) {
        throw new Error(`Error uploading file: ${uploadError.message}`)
      }
      
      // 2. Create record in educational_content table with is_published = false
      const { error: dbError } = await supabase
        .from('educational_content')
        .insert({
          title,
          description,
          file_path: filePath,
          file_name: file.name,
          file_size: file.size,
          content_type: contentType || 'other',
          faculty_id: userId,
          course_id: courseId && courseId !== 'none' ? courseId : null,
          department_id: departmentId && departmentId !== 'none' ? departmentId : null,
          is_published: true // Always publish as available
        })
      
      if (dbError) {
        throw new Error(`Error saving content record: ${dbError.message}`)
      }
      
      toast({
        title: "Success",
        description: "Educational content saved successfully",
      })
      
      // Redirect to content list
      router.push('/dashboard/content')
      router.refresh()
      
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setIsUploading(false)
    }
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Add Educational Content</h1>
        <div className="flex space-x-3">
          <SecondaryButton type="button" onClick={() => router.push('/dashboard/content')}>
            Discard
          </SecondaryButton>
          <SuccessButton type="button" onClick={handleSave} disabled={isUploading}>
            {isUploading ? 'Saving...' : 'Save'}
          </SuccessButton>
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column - Product Details */}
          <Card>
            <CardHeader>
              <CardTitle>Content Details</CardTitle>
              <CardDescription>Basic information about the educational content</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Name</Label>
                <Input 
                  id="title" 
                  value={title} 
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)} 
                  placeholder="Enter a title for this content"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="contentType">Content Type</Label>
                <Select value={contentType} onValueChange={setContentType} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select content type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pdf">PDF Document</SelectItem>
                    <SelectItem value="ppt">Presentation</SelectItem>
                    <SelectItem value="doc">Document</SelectItem>
                    <SelectItem value="audio">Audio</SelectItem>
                    <SelectItem value="video">Video</SelectItem>
                    <SelectItem value="image">Image</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-medium">Description (Optional)</Label>
                <Textarea 
                  id="description" 
                  value={description} 
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)} 
                  placeholder="Set a description to the content for better visibility."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
          
          {/* Right Column - Pricing and Status */}
          <div className="space-y-6">
            {/* Categories Card */}
            <Card>
              <CardHeader>
                <CardTitle>Categories</CardTitle>
                <CardDescription>Organize your content for easier discovery</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="course">Course (Optional)</Label>
                  <Select value={courseId} onValueChange={setCourseId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a course" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {courses.map((course) => (
                        <SelectItem key={course.id} value={course.id}>{course.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="department">Department (Optional)</Label>
                  <Select value={departmentId} onValueChange={setDepartmentId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
            
            {/* Status Card */}
            <Card>
              <CardHeader>
                <CardTitle>Status</CardTitle>
                <CardDescription>Control content visibility</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="is-published"
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    checked={true}
                    readOnly
                  />
                  <Label htmlFor="is-published">Publish immediately</Label>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        
        {/* Images Card */}
        <Card>
          <CardHeader>
            <CardTitle>File Upload</CardTitle>
            <CardDescription>Upload your educational content file</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center bg-muted/20 hover:bg-muted/30 transition-colors duration-200">
              {!file ? (
                <label htmlFor="file-upload" className="cursor-pointer w-full">
                  <div className="flex flex-col items-center justify-center">
                    <Upload className="h-12 w-12 text-purple-500 mb-3" />
                    <p className="text-sm font-medium">Click to upload or drag and drop</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      PDF, PPT, DOC, Audio, Video, Image files supported
                    </p>
                  </div>
                  <input
                    id="file-upload"
                    type="file"
                    className="hidden"
                    onChange={handleFileChange}
                    accept=".pdf,.ppt,.pptx,.doc,.docx,.mp3,.wav,.ogg,.mp4,.mov,.avi,.webm,.jpg,.jpeg,.png,.gif,.webp"
                    required
                  />
                </label>
              ) : (
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center">
                    <File className="h-8 w-8 text-primary mr-2" />
                    <div>
                      <p className="text-sm font-medium">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(file.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setFile(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}
