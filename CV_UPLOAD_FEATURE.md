# CV Upload Feature for Organichart

## Overview

A comprehensive CV/Resume upload feature has been implemented for the organichart application, allowing employees to upload and manage their CVs directly within the organization chart system.

## Features Implemented

### 1. **CV Hover Preview System** ⭐ NEW!

**Instant CV Previews:**
- Hover over any CV entry to see a live preview
- **PDF Support**: Renders first page using PDF.js with fallback to iframe
- **Document Support**: Shows file information and type for DOC/DOCX files
- **Smart Positioning**: Preview tooltip automatically positions to stay in viewport
- **Loading States**: Smooth loading animations and error handling

**Preview Features:**
- Real-time PDF rendering with PDF.js
- File type detection and appropriate icons
- Upload date and file size information
- "Click to download" guidance
- Responsive design for mobile devices

### 2. Database Schema Updates

**New Fields Added to Member Collection:**
- `cvURL`: String - URL to the uploaded CV file in Firebase Storage
- `cvFileName`: String - Original filename of the uploaded CV
- `cvUploadedAt`: Timestamp - When the CV was uploaded

### 3. File Storage

**Supported Formats:**
- PDF (.pdf)
- Microsoft Word (.doc, .docx)

**File Constraints:**
- Maximum file size: 5MB
- Files are stored in Firebase Storage at: `organizations/{organizationId}/members/{memberId}_cv.{extension}`

### 4. User Interface Components

#### EditMemberModal Enhancements
- Added CV upload section with drag-and-drop interface
- File preview showing filename and file size
- Download button for existing CVs
- Remove/Replace CV functionality
- Visual feedback for file validation errors
- **Hover preview functionality** - shows CV content preview when hovering over existing CVs

#### AddMemberModal Enhancements
- CV upload option when creating new members
- Same UI components as EditMemberModal
- Integrated with existing member creation workflow

#### UserInfoSidebar Enhancements
- New "CV / Resume" section displaying:
  - CV filename
  - Upload date
  - Download button with direct link to file
  - **Hover preview functionality** - displays CV preview tooltip on hover

### 5. Backend Functionality

#### Members Store Updates
- Enhanced `updateMember()` function to handle CV uploads/deletions
- Updated `addMember()` functions to support CV uploads during member creation
- Enhanced `deleteMember()` function to clean up CV files when members are deleted
- Automatic file cleanup when CVs are replaced or removed

#### File Management
- Automatic file extension detection and preservation
- Secure file storage with organization-specific paths
- Cleanup of orphaned files when members are deleted
- Support for multiple file formats with proper MIME type validation

### 6. Security & Validation

**File Validation:**
- MIME type checking for supported formats
- File size limits enforced client-side and server-side
- Filename sanitization and extension validation

**Access Control:**
- CV files inherit Firebase Storage security rules
- Only authenticated users can upload/download CVs
- Organization-level access control maintained

## Technical Implementation

### File Upload Flow

1. **File Selection**: User selects CV file through file input
2. **Validation**: Client-side validation of file type and size
3. **Upload**: File uploaded to Firebase Storage with organized path structure
4. **Database Update**: Member document updated with CV metadata
5. **UI Update**: Interface reflects new CV status immediately

### File Download Flow

1. **Access Request**: User clicks download button
2. **URL Retrieval**: Firebase Storage URL retrieved from member data
3. **Direct Download**: Browser opens file in new tab for download/viewing

### File Deletion Flow

1. **Deletion Request**: User removes CV or member is deleted
2. **Storage Cleanup**: File removed from Firebase Storage
3. **Database Cleanup**: CV metadata cleared from member document
4. **UI Update**: Interface updated to reflect removal

## Usage Instructions

### For Employees

#### Uploading a CV:
1. Navigate to your profile or have an admin edit your member details
2. Scroll to the "CV / Resume" section
3. Click "Upload CV" or drag and drop a file
4. Select a PDF, DOC, or DOCX file (max 5MB)
5. Click "Save Changes" to confirm upload

#### Viewing/Downloading a CV:
1. Open the member sidebar by clicking on any member in the chart
2. If a CV is uploaded, it will appear in the "CV / Resume" section
3. **Hover over the CV entry to see an instant preview** ⭐
4. Click "Download" to view or save the CV file

#### Updating a CV:
1. Edit the member details
2. In the CV section, click "Change CV"
3. Select a new file to replace the existing CV
4. Save changes to update

#### Removing a CV:
1. Edit the member details
2. Click "Remove CV" in the CV section
3. Save changes to confirm removal

### For Administrators

Administrators can manage CVs for all organization members through the same interface when editing member details.

## File Organization

```
Firebase Storage Structure:
organizations/
  └── {organizationId}/
      └── members/
          ├── {memberId}.jpg (profile photo)
          ├── {memberId}_cv.pdf (CV file)
          ├── {memberId}_cv.doc (CV file)
          └── {memberId}_cv.docx (CV file)
```

## Benefits

1. **Instant Preview**: Hover over any CV to see immediate preview without downloads ⭐
2. **Centralized Storage**: All employee CVs stored in one secure location
3. **Easy Access**: Quick access to team member qualifications and backgrounds
4. **Professional Presentation**: Clean, integrated interface within the org chart
5. **Smart PDF Rendering**: Advanced PDF.js integration for high-quality previews
6. **Version Control**: Easy updating and replacement of outdated CVs
7. **Mobile Friendly**: Responsive design works on all devices
8. **Secure**: Leverages Firebase's security model for file access control

## Future Enhancements

Potential future improvements could include:
- CV version history tracking
- Automatic CV parsing for skills extraction
- Integration with HR systems
- Bulk CV upload capabilities
- CV expiration reminders
- Advanced search within CV contents

## Technical Notes

- **PDF.js Integration**: Uses PDF.js CDN for high-quality PDF rendering with iframe fallback
- **Smart Preview Positioning**: Tooltips automatically adjust position to stay within viewport
- **Performance Optimized**: Lazy loading of previews only when hovering
- Uses Firebase Storage for reliable, scalable file hosting
- Implements proper error handling for upload failures and preview generation
- Maintains data consistency between Storage and Firestore
- **Responsive Preview Design**: Tooltips adapt to mobile screen sizes
- Follows existing application patterns for consistent UX
- **Cross-browser Compatible**: Works across modern browsers with graceful degradation