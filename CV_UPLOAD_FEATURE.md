# CV Upload Feature Implementation

## Overview

A comprehensive CV/Resume upload feature has been implemented for the OrganiChart application, allowing users to upload, manage, and download CV documents for each team member.

## Features Implemented

### 1. Database Schema Updates
- Added `cvURL` field to member data structure in `src/lib/db/collections.js`
- Updated `createMemberData` function to include CV URL parameter

### 2. Backend Storage & Management
- **File Storage**: CVs are stored in Firebase Storage under `organizations/{orgId}/members/{memberId}/cv.{extension}`
- **Supported Formats**: PDF, DOC, DOCX files
- **File Size Limit**: 10MB maximum for CV files
- **Automatic Cleanup**: CV files are automatically deleted when members are removed

### 3. Member Store Updates (`src/lib/stores/members.js`)
- Enhanced `addMember()` function to handle CV uploads
- Enhanced `addMemberBetween()` function for CV support
- Enhanced `addMemberBetweenMultiple()` function for CV support
- Enhanced `updateMember()` function for CV management (upload/replace/delete)
- Enhanced `deleteMember()` function to clean up CV files

### 4. Add Member Modal (`src/lib/components/AddMemberModal.svelte`)
- **CV Upload Section**: New UI section for CV file selection
- **File Validation**: Client-side validation for file type and size
- **Visual Feedback**: Shows selected file name and size
- **Remove Option**: Ability to remove selected CV before saving
- **Error Handling**: Clear error messages for invalid files

### 5. Edit Member Modal (`src/lib/components/EditMemberModal.svelte`)
- **CV Management**: Full CRUD operations for member CVs
- **Current CV Display**: Shows when a member already has a CV
- **Replace/Remove Options**: Buttons to change or remove existing CVs
- **State Management**: Proper handling of CV upload/removal states

### 6. CV Display Component (`src/lib/components/CVDisplay.svelte`)
- **Download Functionality**: Click to download CV files
- **Multiple Sizes**: Small, medium, large display variants
- **File Type Detection**: Shows appropriate file type (PDF, DOC, DOCX)
- **Responsive Design**: Adapts to different screen sizes

## Technical Implementation Details

### File Upload Process
1. **Client Validation**: File type and size validation before upload
2. **Firebase Storage**: Files uploaded to organized storage paths
3. **URL Generation**: Download URLs stored in Firestore
4. **Error Handling**: Comprehensive error handling throughout the process

### File Management
- **Upload**: New CVs are uploaded with proper file extensions
- **Replace**: Old CVs are replaced, maintaining the same storage path structure
- **Delete**: CVs are removed from both storage and database when deleted
- **Cleanup**: Automatic cleanup when members are deleted

### Security & Validation
- **File Type Validation**: Only PDF, DOC, DOCX files accepted
- **Size Limits**: 10MB maximum file size
- **Storage Rules**: Protected by Firebase authentication rules
- **Access Control**: Only authenticated users can upload/access CVs

## Usage Instructions

### Adding a CV When Creating a Member
1. Open the "Add Member" modal
2. Fill in required member information
3. Scroll to the "CV / Resume" section
4. Click the upload area or "Upload CV" button
5. Select a PDF, DOC, or DOCX file (max 10MB)
6. Review the selected file information
7. Click "Add" to save the member with their CV

### Managing CVs for Existing Members
1. Open the "Edit Member" modal for any team member
2. Scroll to the "CV / Resume" section
3. **To add a CV**: Click "Add CV" and select a file
4. **To replace a CV**: Click "Change CV" and select a new file
5. **To remove a CV**: Click "Remove CV" button
6. Click "Save Changes" to apply the updates

### Downloading CVs
1. Use the `CVDisplay` component in your templates
2. Pass the member's `cvURL` and `memberName` as props
3. Users can click the CV button to download the file
4. Files are downloaded with descriptive names (e.g., "John_Doe_CV.pdf")

## Integration Examples

### Using the CVDisplay Component
```svelte
<script>
  import CVDisplay from '$lib/components/CVDisplay.svelte';
</script>

<!-- In your template -->
{#each members as member}
  <div class="member-card">
    <h3>{member.name}</h3>
    <p>{member.role}</p>
    <CVDisplay 
      cvURL={member.cvURL} 
      memberName={member.name} 
      size="medium" 
    />
  </div>
{/each}
```

### Adding CV Display to Org Chart
The CVDisplay component can be easily integrated into the organizational chart view to allow downloading CVs directly from the chart interface.

## File Structure
```
src/lib/
├── components/
│   ├── AddMemberModal.svelte          # Enhanced with CV upload
│   ├── EditMemberModal.svelte         # Enhanced with CV management  
│   └── CVDisplay.svelte               # New component for CV display/download
├── stores/
│   └── members.js                     # Enhanced with CV functionality
└── db/
    └── collections.js                 # Updated member data schema
```

## Storage Structure
```
Firebase Storage:
organizations/
├── {organizationId}/
│   └── members/
│       ├── {memberId1}/
│       │   └── cv.pdf
│       ├── {memberId2}/
│       │   └── cv.docx
│       └── {memberId3}/
│           └── cv.doc
```

## Error Handling

### Client-Side Validation
- Invalid file types show clear error messages
- File size exceeded warnings
- Network error handling during upload

### Server-Side Handling
- Firebase Storage errors are caught and logged
- Firestore update errors are handled gracefully
- Cleanup operations continue even if some files are missing

## Performance Considerations
- File uploads are handled asynchronously
- Large files show upload progress (if implemented)
- Storage URLs are cached in Firestore for quick access
- Automatic cleanup prevents storage bloat

## Future Enhancements
- **File Preview**: Add PDF preview functionality
- **Bulk Upload**: Support for uploading multiple CVs at once
- **Version History**: Keep track of CV versions
- **Advanced Search**: Search members by CV content
- **Templates**: Provide CV templates for members
- **Integration**: Connect with external HR systems

## Testing
- Test file upload with various file types and sizes
- Verify proper error handling for invalid files
- Test CV replacement and deletion functionality
- Verify cleanup when members are deleted
- Test download functionality across different browsers

The CV upload feature is now fully integrated and ready for use in the OrganiChart application.