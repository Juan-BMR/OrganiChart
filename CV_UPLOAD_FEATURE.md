# CV Upload Feature

## Overview
This feature allows users to upload CV (resume) files for each member in the organization chart. CVs are stored as PDF files in Firebase Storage and can be downloaded from the member information sidebar.

## Implementation Details

### 1. Data Storage
- CV files are stored in Firebase Storage at: `organizations/{organizationId}/members/{memberId}_cv.pdf`
- A `cvURL` field is added to member documents in Firestore to store the download URL

### 2. Components Modified

#### Members Store (`src/lib/stores/members.js`)
- Added `cvFile` parameter to `updateMember()` method
- Handles CV upload/removal similar to photo uploads
- Supports file size limit of 10MB for PDFs
- Cleans up CV files when member is deleted

#### Edit Member Modal (`src/lib/components/EditMemberModal.svelte`)
- Added CV upload UI section below photo upload
- Supports PDF file uploads only
- Shows current CV filename if one exists
- Allows users to:
  - Upload new CV
  - Replace existing CV
  - Remove current CV
- Validates file type and size

#### User Info Sidebar (`src/lib/components/UserInfoSidebar.svelte`)
- Displays CV download link in Personal Details section
- Shows download button with file icon
- Opens CV in new tab when clicked
- Properly formatted filename for downloads

### 3. Features
- **File Validation**: Only accepts PDF files up to 10MB
- **Visual Feedback**: Shows uploaded filename and status
- **Easy Management**: Clear buttons to upload, change, or remove CV
- **Secure Storage**: Files are protected by Firebase authentication rules
- **Clean UI**: Consistent with existing photo upload interface

### 4. Usage
1. Click "Edit" on any member in the organization chart
2. Scroll to the "CV (Resume)" section
3. Click to upload a PDF file
4. Save changes
5. View/download the CV from the member's info sidebar

### 5. Security
- Files are only accessible to authenticated users
- Storage rules enforce authentication requirement
- File paths include organization ID for isolation

## Future Enhancements
- Support for multiple file formats (DOC, DOCX)
- CV preview functionality
- Version history for CV updates
- Bulk CV upload feature