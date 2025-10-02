# Dashboard Theme Color Update Guide

## Current Status
Your application uses the green theme color `#008C45` (from navbar) but the dashboards still use various colors (blue, pink, purple, indigo, amber).

## Theme Colors to Use

### Primary Green (from Navbar)
```css
#008C45  /* Main green */
#006633  /* Darker green for gradients */
#00a854  /* Lighter green for dark mode */
#E8F5E9  /* Very light green for backgrounds */
```

## Files That Need Updates

### 1. Admin Dashboard (`components/dashboard/admin-dashboard.tsx`)

**Current Issues:**
- Line 312: Uses `from-blue-600 to-indigo-600` for "Administrative Actions" title
- Line 422: Uses `from-indigo-600 to-purple-600` for "Recent Activity" title  
- Line 306: Top border uses `from-blue-500 via-purple-500 to-pink-500`
- Line 415: Top border uses `from-indigo-500 via-purple-500 to-pink-500`

**Replace with:**
```tsx
// Titles
className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#008C45] to-[#006633] dark:from-[#00a854] dark:to-[#008C45]"

// Top borders
className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#008C45] via-[#00a854] to-[#006633]"

// Icon backgrounds
className="bg-[#E8F5E9] dark:bg-green-900/30 p-2 rounded-full"

// Icon colors
className="h-5 w-5 text-[#008C45] dark:text-green-400"
```

### 2. Faculty Dashboard (`components/dashboard/faculty-dashboard.tsx`)

**Current Issues:**
- Uses blue, green, and red colors for stat cards
- Line 37, 67, 97: Icon colors (blue-500, green-500, red-500)
- Line 46, 76, 112: Progress bars (blue-500, green-500, red-500)
- Line 136: GraduationCap icon (blue-500)
- Line 146, 165, 185: Section icons (blue-500, green-500, red-500)

**Replace with:**
```tsx
// Primary icons and elements
text-[#008C45]

// Backgrounds
bg-[#E8F5E9]

// Progress bars
bg-[#008C45]

// Borders
border-[#008C45]
```

### 3. Student Dashboard (`components/dashboard/student-dashboard.tsx`)

**Current Issues:**
- Line 33-101: Stat cards use pink, blue, green colors
- Line 35, 54, 86: Icons (pink-500, blue-500, green-500)
- Line 114, 184: Section icons (pink-500)
- Line 126, 155, 283: Progress bars (from-pink-500 to-pink-400)
- Line 211-228: Chart colors (#e91e63, #9c27b0, #2196f3)
- Line 287: Button (bg-[#e91e63])

**Replace with:**
```tsx
// Main color for all primary elements
text-[#008C45]
bg-[#008C45]
from-[#008C45] to-[#006633]

// Light backgrounds
bg-[#E8F5E9]

// Borders
border-[#008C45]
```

### 4. User Dashboard (`components/dashboard/user-dashboard.tsx`)

**Current Issues:**
- Line 281-351: Stat cards use pink, blue, green colors
- Line 283, 307, 331: Icons (pink-500, blue-500, green-500)
- Line 116, 123: Buttons (bg-blue-500, bg-green-500)
- Line 410: Progress circle (text-purple-500)

**Replace with:**
```tsx
// All primary colors
text-[#008C45]
bg-[#008C45]
hover:bg-[#006633]

// Light backgrounds
bg-[#E8F5E9]

// Borders
border-[#008C45]

// Gradients
from-[#008C45] to-[#006633]
```

## Global Color Replacement Strategy

### Find and Replace Patterns

1. **Blue colors:**
   - `text-blue-500` → `text-[#008C45]`
   - `bg-blue-500` → `bg-[#008C45]`
   - `from-blue-600` → `from-[#008C45]`
   - `border-blue-300` → `border-[#008C45]/30`

2. **Pink colors:**
   - `text-pink-500` → `text-[#008C45]`
   - `bg-pink-500` → `bg-[#008C45]`
   - `from-pink-500` → `from-[#008C45]`
   - `border-pink-300` → `border-[#008C45]/30`

3. **Purple/Indigo colors:**
   - `text-purple-500` → `text-[#008C45]`
   - `text-indigo-600` → `text-[#008C45]`
   - `from-indigo-600` → `from-[#008C45]`

4. **Light backgrounds:**
   - `bg-blue-50` → `bg-[#E8F5E9]`
   - `bg-pink-50` → `bg-[#E8F5E9]`
   - `bg-purple-50` → `bg-[#E8F5E9]`

## Implementation Steps

1. **Backup files** before making changes
2. **Use find and replace** in your IDE with the patterns above
3. **Test each dashboard** after changes
4. **Check dark mode** appearance
5. **Verify hover states** still work correctly

## Secondary Colors (Keep These)

These colors serve specific purposes and should remain:
- **Red** (`#dc2626`) - For errors, urgent states, deletions
- **Amber** (`#f59e0b`) - For warnings, pending states
- **Green** (success states) - For approved, completed states
- **Gray** - For muted text and borders

## Notes

- The green theme (`#008C45`) should be used for ALL primary elements: headings, titles, primary buttons, icons, progress bars
- Keep the existing card background gradients (they're subtle and work well)
- Maintain the existing hover effects and transitions
- Dark mode variants should use `#00a854` (lighter green) for better contrast

## Testing Checklist

After updates, verify:
- [ ] All dashboard headings use green color
- [ ] All primary icons use green color
- [ ] All primary buttons use green color
- [ ] Progress bars and charts use green color
- [ ] Hover states work correctly
- [ ] Dark mode looks good
- [ ] No broken styles or missing colors
- [ ] Consistent theme across all role dashboards

## Quick Reference

```tsx
// Primary green
#008C45

// Dark green (for gradients)
#006633

// Light green (dark mode)
#00a854

// Very light green (backgrounds)
#E8F5E9

// Usage examples:
text-[#008C45]
bg-[#008C45]
border-[#008C45]
from-[#008C45] to-[#006633]
bg-[#E8F5E9]
```
