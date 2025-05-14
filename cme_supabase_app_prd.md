# CME Platform with Supabase - Product Requirements Document (PRD)

## 1. Introduction

### 1.1 Purpose
This document outlines the requirements for a mobile-friendly Continuing Medical Education (CME) platform built with Next.js and Supabase. The platform aims to provide a comprehensive solution for managing educational content, tracking attendance, and facilitating communication between students, faculty, and administrators in a medical education context.

### 1.2 Scope
The CME platform will serve as a centralized system for educational content delivery, user management, and attendance tracking. It will support multiple user roles with different permissions and access levels.

### 1.3 Definitions
- **CME**: Continuing Medical Education
- **User Roles**: Different access levels (Student, Faculty, Admin)
- **Training Module**: System for uploading and accessing educational content
- **Attendance Management**: System for tracking student attendance

## 2. System Overview

### 2.1 Technology Stack
- **Frontend**: Next.js, React
- **Styling**: Tailwind CSS, ShadCN UI components
- **Authentication**: Supabase Authentication
- **Backend & Database**: Supabase (PostgreSQL database with RESTful and real-time APIs)
- **File Storage**: Supabase Storage
- **Deployment**: Vercel (frontend) and Supabase (backend)

### 2.2 Supabase Integration

The CME platform will leverage Supabase as its backend solution, providing several advantages:

- **Authentication**: Built-in authentication system with multiple providers
- **PostgreSQL Database**: Powerful relational database with full SQL capabilities
- **Real-time Subscriptions**: Real-time data updates using PostgreSQL's LISTEN/NOTIFY
- **Storage**: Integrated file storage solution for educational materials
- **Row-Level Security (RLS)**: Fine-grained access control at the database level
- **Edge Functions**: Serverless functions for custom backend logic
- **Type Safety**: Generated TypeScript types for database schema
- **Open Source**: Full visibility and control over the backend

## 3. User Roles and Permissions

### 3.1 Student
- Access personalized dashboard
- View and download available educational content
- Track personal attendance records
- Update personal profile information
- Receive notifications about new content or events

### 3.2 Faculty
- All Student permissions
- Upload educational content (PDFs, PPTs, audio, videos, etc.)
- Categorize content by department
- View attendance records for their courses/sessions
- Create and manage educational sessions

### 3.3 Admin
- All Faculty permissions
- User management (create, edit, delete users)
- Role assignment
- System-wide analytics and reporting
- Department management
- System configuration

## 4. Feature Requirements

### 4.1 Authentication System
- Secure login/logout functionality using Supabase Auth
- Password reset capability
- Role-based access control using Supabase RLS policies
- Session management
- Email verification
- Optional: Social login integration (Google, Microsoft)

### 4.2 User Dashboard
- Personalized dashboard based on user role
- Quick access to relevant features and content
- Activity summary and notifications
- Recent content and upcoming sessions
- Real-time updates using Supabase subscriptions

### 4.3 Training Module
- File upload system using Supabase Storage
- Support for multiple formats (PDF, PPT, audio, video, etc.)
- Content categorization by department and type
- Search and filter functionality using PostgreSQL full-text search
- Content preview capability
- Download tracking
- Version control for updated content

### 4.4 Attendance Management
- Session creation and scheduling
- Attendance tracking mechanisms (QR codes, check-in buttons, etc.)
- Attendance reports and analytics using PostgreSQL queries
- Notification system for upcoming sessions
- Historical attendance records

### 4.5 User Profile Management
- Personal information management
- Profile picture upload to Supabase Storage
- Notification preferences
- Account settings

### 4.6 Department Management
- Create and manage departments
- Assign users to departments
- Department-specific content and sessions

## 5. Database Schema

### 5.1 Core Tables
- **profiles**: Extended user information beyond auth.users
- **departments**: Department information
- **user_departments**: Many-to-many relationship between users and departments
- **content**: Educational content metadata
- **content_files**: Files associated with content items
- **sessions**: Educational sessions/events
- **attendance**: Attendance records for sessions
- **notifications**: User notifications

### 5.2 Row-Level Security Policies
- Students can only view their own profile and attendance
- Faculty can view and manage their own content and sessions
- Faculty can view attendance for their sessions
- Admins have full access to all tables

## 6. Non-Functional Requirements

### 6.1 Performance
- Fast page load times (<2 seconds)
- Responsive design for all screen sizes
- Efficient file upload and download
- Optimized database queries with proper indexing

### 6.2 Security
- Data encryption at rest and in transit
- Secure authentication with Supabase Auth
- Row-level security policies for all tables
- Regular security audits
- GDPR compliance
- Secure file storage with access control

### 6.3 Scalability
- Support for growing user base
- Database optimization for large datasets
- Connection pooling for high traffic
- Edge functions for distributed processing

### 6.4 Usability
- Intuitive user interface
- Consistent design language
- Accessibility compliance
- Mobile-friendly design

## 7. Future Expansion Possibilities

### 7.1 Potential Features
- Live webinar integration
- Quiz and assessment system
- Certificate generation
- Discussion forums using Supabase real-time features
- Peer-to-peer messaging
- Calendar integration
- Mobile app version
- Analytics dashboard
- Integration with external LMS systems

## 8. Project Timeline and Milestones

### 8.1 Phase 1: Foundation
- Project setup and configuration
- Supabase project creation and initial schema design
- Authentication system implementation
- Basic user management
- UI framework implementation

### 8.2 Phase 2: Core Features
- User dashboards with real-time updates
- Training module with Supabase Storage integration
- Department management
- Profile management

### 8.3 Phase 3: Advanced Features
- Attendance management system
- Advanced content management
- Notifications system
- Search and filter functionality

### 8.4 Phase 4: Refinement
- UI/UX improvements
- Performance optimization
- Bug fixes and testing
- Documentation
- Deployment optimization

## 9. Success Metrics

### 9.1 Key Performance Indicators
- User adoption rate
- Content upload frequency
- Attendance tracking accuracy
- System uptime
- User satisfaction ratings
- Database query performance

## 10. Technical Implementation Details

### 10.1 Supabase Setup
- Project creation and configuration
- Database schema implementation
- RLS policy configuration
- Storage bucket setup
- Authentication provider configuration

### 10.2 Next.js Integration
- Supabase client setup
- Authentication hooks and providers
- Server-side rendering with Supabase data
- API routes for complex operations
- Middleware for protected routes

### 10.3 Deployment Strategy
- Vercel deployment for Next.js frontend
- Environment variable management
- Database migration strategy
- Backup and disaster recovery plan
