'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/client'
import { Button } from '@/components/ui/button'
import { Card as BaseCard, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

// Custom Card component with rounded corners
const Card = ({ className, ...props }: React.ComponentProps<typeof BaseCard>) => (
  <BaseCard className={`rounded-2xl overflow-hidden shadow-sm ${className || ''}`} {...props} />
)

const SuccessButton = ({ className, ...props }: React.ComponentProps<typeof Button>) => (
  <Button className={`bg-[#008C45] hover:bg-[#006633] text-white rounded-xl ${className || ''}`} {...props} />
)
import { Input as BaseInput } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea as BaseTextarea } from '@/components/ui/textarea'
import { Select as BaseSelect, SelectContent, SelectItem, SelectTrigger as BaseSelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'

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
import { OrganisationSelect } from '@/components/organisation-select'

interface UploadContentFormProps {
  userId: string
}

interface Department {
  id: string
  name: string
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'An unexpected error occurred'
}

export function UploadContentForm({ userId }: UploadContentFormProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [contentType, setContentType] = useState<string>('')
  const [departmentId, setDepartmentId] = useState<string>('')
  const [visibility, setVisibility] = useState<'all' | 'organisation'>('all')
  const [organisationId, setOrganisationId] = useState('')
  const [isPublished, setIsPublished] = useState(true)
  const [publishStartAt, setPublishStartAt] = useState('')
  const [publishEndAt, setPublishEndAt] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [departments, setDepartments] = useState<Department[]>([])
  
  const router = useRouter()
  const supabase = createClient()
  
  // Fetch departments
  useEffect(() => {
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
    
    fetchDepartments()
  }, [supabase])
  
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

  const getPublishWindow = () => {
    const startAt = publishStartAt ? new Date(publishStartAt) : null
    const endAt = publishEndAt ? new Date(publishEndAt) : null

    if (startAt && Number.isNaN(startAt.getTime())) {
      throw new Error('Please enter a valid publish start date')
    }

    if (endAt && Number.isNaN(endAt.getTime())) {
      throw new Error('Please enter a valid publish end date')
    }

    if (startAt && endAt && endAt <= startAt) {
      throw new Error('Publish end date must be after the start date')
    }

    return {
      publish_start_at: startAt ? startAt.toISOString() : null,
      publish_end_at: endAt ? endAt.toISOString() : null,
    }
  }

  const uploadContent = async () => {
    if (!file) {
      throw new Error('Please select a file to upload')
    }

    const fileExt = file.name.split('.').pop()
    const fileName = `${Math.random().toString(36).substring(2, 15)}_${Math.random().toString(36).substring(2, 15)}.${fileExt}`
    const filePath = `${userId}/${fileName}`
    const publishWindow = getPublishWindow()

    const mimeType = file.type || 'application/octet-stream'
    const { error: uploadError } = await supabase.storage
      .from('content')
      .upload(filePath, file, { contentType: mimeType, upsert: true })

    if (uploadError) {
      throw new Error(`Error uploading file: ${uploadError.message}`)
    }

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
        department_id: departmentId && departmentId !== 'none' ? departmentId : null,
        organisation_id: visibility === 'organisation' ? organisationId : null,
        is_published: isPublished,
        ...publishWindow,
      })

    if (dbError) {
      await supabase.storage.from('content').remove([filePath])
      throw new Error(`Error saving content record: ${dbError.message}`)
    }
  }

  const resetForm = () => {
    setTitle('')
    setDescription('')
    setContentType('')
    setDepartmentId('')
    setVisibility('all')
    setOrganisationId('')
    setIsPublished(true)
    setPublishStartAt('')
    setPublishEndAt('')
    setFile(null)
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

    if (visibility === 'organisation' && !organisationId) {
      toast({
        title: 'Error',
        description: 'Please select an organisation for restricted content',
        variant: 'destructive'
      })
      return
    }
    
    setIsUploading(true)
    
    try {
      await uploadContent()
      
      toast({
        title: 'Success',
        description: isPublished ? 'Educational content uploaded successfully' : 'Educational content saved as draft',
      })
      
      resetForm()
      
      // Redirect to content list
      router.push('/dashboard/content')
      router.refresh()
      
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description: getErrorMessage(error),
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

    if (visibility === 'organisation' && !organisationId) {
      toast({
        title: "Error",
        description: "Please select an organisation for restricted content",
        variant: "destructive"
      })
      return
    }
    
    setIsUploading(true)
    
    try {
      await uploadContent()
      
      toast({
        title: "Success",
        description: isPublished ? "Educational content saved and published" : "Educational content saved as draft",
      })
      
      // Redirect to content list
      router.push('/dashboard/content')
      router.refresh()
      
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: getErrorMessage(error),
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
                <div className="space-y-2">
                  <Label htmlFor="visibility">Audience</Label>
                  <Select value={visibility} onValueChange={(value) => setVisibility(value as 'all' | 'organisation')}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select audience" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All organisations</SelectItem>
                      <SelectItem value="organisation">Specific organisation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {visibility === 'organisation' && (
                  <OrganisationSelect
                    value={organisationId}
                    onValueChange={setOrganisationId}
                    includeOther={false}
                    activeOnly
                    label="Organisation"
                    placeholder="Select organisation"
                    required
                  />
                )}
              </CardContent>
            </Card>
            
            {/* Status Card */}
            <Card>
              <CardHeader>
                <CardTitle>Publishing</CardTitle>
                <CardDescription>Control when content is visible</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between gap-4 rounded-xl border p-3">
                  <div>
                    <Label htmlFor="is-published">Published</Label>
                    <p className="text-xs text-muted-foreground">
                      Turn off to save this content as a draft.
                    </p>
                  </div>
                  <Switch
                    id="is-published"
                    checked={isPublished}
                    onCheckedChange={setIsPublished}
                  />
                </div>
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="publish-start">Publish From (Optional)</Label>
                    <Input
                      id="publish-start"
                      type="datetime-local"
                      value={publishStartAt}
                      onChange={(event: React.ChangeEvent<HTMLInputElement>) => setPublishStartAt(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="publish-end">Publish Until (Optional)</Label>
                    <Input
                      id="publish-end"
                      type="datetime-local"
                      value={publishEndAt}
                      onChange={(event: React.ChangeEvent<HTMLInputElement>) => setPublishEndAt(event.target.value)}
                    />
                  </div>
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
