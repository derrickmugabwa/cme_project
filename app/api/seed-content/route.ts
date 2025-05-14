import { createClient } from '@/lib/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Create a regular client for user authentication
    const supabase = await createClient()
    
    // Create a service role client to bypass RLS policies
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceRoleKey) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY is not defined')
    }
    
    const supabaseAdmin = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      serviceRoleKey
    )
    
    // First, check if there's already content
    const { data: existingContent, error: checkError } = await supabaseAdmin
      .from('educational_content')
      .select('id')
      .limit(1)
    
    if (checkError) {
      throw new Error(`Error checking content: ${checkError.message}`)
    }
    
    if (existingContent && existingContent.length > 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'Content already exists, no need to seed.', 
        existing: true,
        count: existingContent.length
      })
    }
    
    // Get the current authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      throw new Error('Authentication required to seed content')
    }
    
    // Get the user's profile to check their role
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, role')
      .eq('id', user.id)
      .single()
    
    if (profileError) {
      throw new Error(`Error fetching user profile: ${profileError.message}`)
    }
    
    if (!userProfile) {
      throw new Error('User profile not found')
    }
    
    console.log('Using current user as content creator:', { id: userProfile.id, role: userProfile.role })
    
    // For the purpose of seeding content, we'll use the current user as the faculty
    // regardless of their actual role
    const facultyId = userProfile.id
    
    // Get a course to associate with the content
    const { data: course, error: courseError } = await supabaseAdmin
      .from('courses')
      .select('id')
      .limit(1)
      .single()
    
    let courseId = null
    if (!courseError && course) {
      courseId = course.id
    }
    
    // Create a sample department if none exists
    const { data: department, error: deptError } = await supabaseAdmin
      .from('departments')
      .select('id')
      .limit(1)
      .single()
    
    let departmentId = null
    if (deptError || !department) {
      // Create a department
      const { data: newDept, error: createDeptError } = await supabaseAdmin
        .from('departments')
        .insert({
          name: 'Medicine',
          description: 'Department of Medicine'
        })
        .select('id')
        .single()
      
      if (createDeptError) {
        console.error('Error creating department:', createDeptError)
      } else if (newDept) {
        departmentId = newDept.id
      }
    } else {
      departmentId = department.id
    }
    
    // Create sample content
    const sampleContent = [
      {
        title: 'Introduction to Medical Ethics',
        description: 'A comprehensive guide to medical ethics for healthcare professionals',
        file_path: `${facultyId}/sample_ethics.pdf`,
        file_name: 'sample_ethics.pdf',
        file_size: 1024 * 1024, // 1MB
        content_type: 'pdf',
        faculty_id: facultyId,
        course_id: courseId,
        department_id: departmentId,
        is_published: true,
        download_count: 5
      },
      {
        title: 'Advanced Cardiac Care',
        description: 'Latest techniques in cardiac care and treatment',
        file_path: `${facultyId}/cardiac_care.ppt`,
        file_name: 'cardiac_care.ppt',
        file_size: 2 * 1024 * 1024, // 2MB
        content_type: 'ppt',
        faculty_id: facultyId,
        course_id: courseId,
        department_id: departmentId,
        is_published: true,
        download_count: 3
      },
      {
        title: 'Medical Imaging Fundamentals',
        description: 'Basic principles of medical imaging and diagnostics',
        file_path: `${facultyId}/imaging.pdf`,
        file_name: 'imaging.pdf',
        file_size: 3 * 1024 * 1024, // 3MB
        content_type: 'pdf',
        faculty_id: facultyId,
        course_id: courseId,
        department_id: departmentId,
        is_published: true,
        download_count: 7
      }
    ]
    
    // Insert the sample content
    const { data: insertedContent, error: insertError } = await supabaseAdmin
      .from('educational_content')
      .insert(sampleContent)
      .select()
    
    if (insertError) {
      throw new Error(`Error inserting content: ${insertError.message}`)
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Sample educational content created successfully',
      count: insertedContent.length,
      data: insertedContent
    })
    
  } catch (error: any) {
    console.error('Error seeding content:', error)
    return NextResponse.json({ 
      success: false, 
      message: error.message || 'An error occurred while seeding content'
    }, { status: 500 })
  }
}
