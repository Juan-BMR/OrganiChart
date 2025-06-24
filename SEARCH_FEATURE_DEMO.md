# Member Search and Filter Feature

## Overview

The Member Search and Filter feature allows users to quickly find team members in large organizations through real-time search and filtering capabilities.

## Features

### 1. **Real-time Search**
- Search by member name, email, or role
- Results update as you type
- Case-insensitive matching

### 2. **Advanced Filtering**
- Filter by role (e.g., "Manager", "Engineer", "Designer")
- Filter by department (when available)
- Combine search and filters for precise results

### 3. **Quick Navigation**
- Click on any search result to:
  - Center the org chart on that member
  - Open their detailed info sidebar
  - View their position in the hierarchy

### 4. **Export Capabilities**
- Export filtered results as CSV or JSON
- CSV includes: Name, Email, Role, Department, Manager, Phone, Location, Start Date
- Automatic filename generation with timestamp

## How to Use

1. **Access the Search**
   - Click the "Search Members" button in the floating controls
   - A modal will appear with the search interface

2. **Search for Members**
   - Type in the search box to find members by name, email, or role
   - Results appear instantly below the search field

3. **Apply Filters**
   - Use the role dropdown to filter by specific roles
   - Use the department dropdown to filter by departments (when data is available)

4. **Navigate to Members**
   - Click on any member in the results to jump to their position in the chart
   - The chart will zoom and center on the selected member

5. **Export Results**
   - Click the "Export" button to download the current search results
   - Choose between CSV (for Excel) or JSON (for developers) format

## Technical Implementation

### Components Created

1. **MemberSearch.svelte** - Main search component with:
   - Text input with debounced search
   - Dropdown filters for roles and departments
   - Results list with member avatars
   - Export functionality

2. **export.js** - Utility functions for:
   - CSV export with proper escaping
   - JSON export with formatting
   - Printable org chart reports

### Integration Points

- Integrated into the org chart page (`/org/[id]/chart`)
- Added search button to floating controls
- Modal overlay for search interface
- Automatic chart navigation on member selection

### Data Model Updates

Extended member schema to include:
- `department` - Member's department
- `phone` - Contact phone number
- `location` - Office location

These fields are optional and backward compatible with existing data.

## Future Enhancements

1. **Advanced Search**
   - Search by manager name
   - Search by hire date range
   - Full-text search across all fields

2. **Saved Searches**
   - Save frequently used search criteria
   - Quick access to saved searches

3. **Bulk Operations**
   - Select multiple members from search results
   - Bulk edit or export selected members

4. **Analytics**
   - Show search result statistics
   - Department/role distribution charts

## Benefits

- **Improved Navigation** - Quickly find anyone in large organizations
- **Better Data Management** - Export filtered member lists for reporting
- **Enhanced User Experience** - Reduce time spent manually browsing the chart
- **Scalability** - Essential feature for organizations with 50+ members