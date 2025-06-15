# Site Management Plan for CME Platform

## Overview

This document outlines the plan for implementing a site management feature in the admin dashboard, allowing administrators to manage content on the landing page components. This feature will integrate with the existing admin dashboard structure.

## Goals

- Create an intuitive interface for admins to update landing page content
- Implement a database-driven approach for dynamic content management
- Ensure content changes are reflected immediately on the landing page
- Provide a preview functionality for content changes before publishing
- Maintain consistency with the existing admin dashboard UI/UX

## Database Structure

We'll need to create tables in Supabase to store the content for each section:

### Tables

1. **landing_hero** - For hero section content
   - id (primary key)
   - title
   - subtitle
   - cta_primary_text
   - cta_secondary_text
   - image_url
   - created_at
   - updated_at

2. **landing_features** - For features section
   - id (primary key)
   - title
   - description
   - icon
   - order_index
   - created_at
   - updated_at

3. **landing_testimonials** - For testimonials section
   - id (primary key)
   - name
   - role
   - company
   - content
   - avatar_url
   - rating (1-5)
   - order_index
   - created_at
   - updated_at

4. **landing_stats** - For statistics section
   - id (primary key)
   - title
   - value
   - icon
   - order_index
   - created_at
   - updated_at

5. **landing_cta** - For call-to-action section
   - id (primary key)
   - title
   - description
   - button_primary_text
   - button_secondary_text
   - created_at
   - updated_at

6. **landing_settings** - For general settings
   - id (primary key)
   - site_title
   - meta_description
   - contact_email
   - social_links (JSON)
   - footer_text
   - created_at
   - updated_at

## Admin Interface Components

### 1. Site Management Main Page

- Dashboard with overview of all editable sections
- Quick stats on last updates
- Preview button for viewing current landing page
- Integration with existing admin sidebar navigation

### 2. Section-specific Management Tabs

Each tab will correspond to a landing page section, following the existing tab pattern used in other admin sections:

#### Hero Section Tab
- Form fields for title, subtitle, and CTA buttons
- Image upload for hero image
- Live preview of changes

#### Features Section Tab
- List of current features with drag-and-drop reordering
- Add/Edit/Delete feature items
- Icon selection from a predefined library

#### Testimonials Section Tab
- List of testimonials with filtering and sorting
- Form for adding/editing testimonials
- Avatar image upload
- Rating selector

#### Stats Section Tab
- List of current stats with inline editing
- Add/Delete stat items
- Icon selection
- Number formatting options

#### CTA Section Tab
- Form fields for CTA title, description, and buttons
- Background gradient customization

#### Footer & Settings Tab
- Site title and meta description
- Social media links management
- Footer text editor
- Contact information

## Implementation Phases

### Phase 1: Database Setup
1. Create necessary tables in Supabase
2. Set up RLS policies for admin-only access (restricted to users with 'admin' role)
3. Create initial seed data based on current landing page content

### Phase 2: Admin UI Development
1. Add "Site Management" link to the admin sidebar navigation
2. Create site management main page in admin dashboard at `/dashboard/admin/site`
3. Implement tab navigation system consistent with existing admin UI
4. Develop forms for each section using the existing UI components

### Phase 3: Content Management Logic
1. Implement CRUD operations for each content type
2. Add image upload functionality with Supabase storage
3. Create preview functionality
4. Implement proper error handling and validation

### Phase 4: Landing Page Integration
1. Modify landing page components to fetch content from database
2. Implement caching for performance optimization
3. Add fallback content for missing data
4. Ensure SSR compatibility for optimal performance

### Phase 5: Testing and Refinement
1. Test all CRUD operations
2. Verify content updates are reflected on landing page
3. Performance testing
4. User acceptance testing with admin users
5. Security testing to ensure only admin users can access site management

## UI Integration with Existing Dashboard

### 1. Sidebar Navigation Update

Add a new navigation item to the admin sidebar:

```jsx
{userRole === 'admin' && (
  <NavItem href="/dashboard/admin/site">
    <Layout className="h-4 w-4" />
    Site Management
  </NavItem>
)}
```

### 2. Site Management Page Layout

```
+---------------------------------------+
|                                       |
|  CME Platform                     👤  |
|                                       |
+---------------------------------------+
|                                       |
| D |                                   |
| A | Site Management                   |
| S |                                   |
| H | +---+-----+------+-----+-----+-+ |
| B | |Hero|Feat.|Test.|Stats|CTA|Nav| |
| O | +---+-----+------+-----+-----+-+ |
| A |                                   |
| R | [Current Section Content Form]    |
| D |                                   |
|   | +---------------------------+     |
| S | |                           |     |
| I | |     Live Preview Area     |     |
| D | |                           |     |
| E | +---------------------------+     |
| B |                                   |
| A | [Save Draft] [Preview] [Publish]  |
| R |                                   |
|   |                                   |
+---------------------------------------+
```

## Technical Considerations

1. **State Management**: Use React Context or Redux for managing form state across tabs
2. **Image Optimization**: Implement image resizing and optimization before storage
3. **Caching**: Use SWR or React Query for efficient data fetching and caching
4. **Validation**: Implement form validation for all input fields
5. **Permissions**: Ensure only admin users can access the site management features
6. **Versioning**: Consider implementing content versioning for rollback capability
7. **Audit Logging**: Track changes made to landing page content

## Next Steps

1. Review this plan with the team
2. Create database migration files for the new tables
3. Add the site management navigation item to the sidebar
4. Create the basic route structure at `/dashboard/admin/site`
5. Begin implementation of the first content management tab (Hero section)

## Integration with Existing Code

### 1. New Routes to Create

- `/dashboard/admin/site/page.tsx` - Main site management page
- `/dashboard/admin/site/layout.tsx` - Layout with tabs navigation
- `/dashboard/admin/site/hero/page.tsx` - Hero section management
- `/dashboard/admin/site/features/page.tsx` - Features section management
- `/dashboard/admin/site/testimonials/page.tsx` - Testimonials management
- `/dashboard/admin/site/stats/page.tsx` - Stats section management
- `/dashboard/admin/site/cta/page.tsx` - CTA section management
- `/dashboard/admin/site/navbar/page.tsx` - Navigation management

### 2. New API Routes to Create

- `/api/admin/site/[section]/route.ts` - CRUD operations for each section
- `/api/admin/site/preview/route.ts` - Preview functionality

### 3. Access Control

Leverage the existing role-based access control to ensure only admin users can access the site management functionality:

```typescript
// In page components
if (userRole !== 'admin') {
  redirect('/dashboard');
}
```
