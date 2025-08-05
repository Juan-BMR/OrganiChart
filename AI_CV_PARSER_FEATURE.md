# AI-Powered CV Parser for OrganiChart

## Overview

The AI CV Parser is an intelligent feature that automatically extracts structured information from uploaded CVs/resumes, making it easier to manage team member profiles and search for specific skills across your organization.

## Key Features

### 🤖 Intelligent CV Parsing
- **Automatic Extraction**: Uses OpenAI's GPT-4 to extract key information from PDFs
- **Structured Data**: Parses skills, experience, education, certifications, and achievements
- **Smart Categorization**: Automatically categorizes skills into technical, soft skills, and languages

### 🔍 Skills-Based Search
- **Dynamic Filtering**: Search and filter organization members by their skills
- **Visual Highlighting**: Members matching skill filters are highlighted in the org chart
- **Real-time Updates**: Filter results update instantly as you type

### ✏️ Editable Extracted Data
- **Review & Edit**: All extracted information can be reviewed and edited
- **Manual Additions**: Add skills or experience that may have been missed
- **Persistent Storage**: Extracted data is saved with the member profile

## How to Use

### 1. Uploading and Parsing CVs

When editing a member's profile:

1. Click on **"Edit"** for any member in the org chart
2. In the **CV/Resume** section, click **"Upload CV"**
3. Select a PDF file (Word documents coming soon)
4. The AI will automatically parse the CV in the background
5. Once parsed, click **"View Extracted Data"** to see the results

### 2. Reviewing Extracted Information

The extracted data includes:

- **Professional Summary**: A brief overview of the person's background
- **Skills**: 
  - Technical Skills (programming languages, tools, frameworks)
  - Soft Skills (leadership, communication, teamwork)
  - Languages (with proficiency levels)
- **Experience**: Job titles, companies, durations, and key responsibilities
- **Education**: Degrees, institutions, years, and fields of study
- **Certifications**: Professional certifications with issuers and dates
- **Key Achievements**: Notable accomplishments and awards

### 3. Editing Extracted Data

To edit the extracted information:

1. Click **"Edit"** in the extracted data view
2. Add or remove skills using the **"+ Add"** buttons
3. Edit experience entries directly in the text fields
4. Click **"Save"** to persist your changes

### 4. Searching by Skills

To find team members with specific skills:

1. Look for the **"Search by Skills"** panel in the org chart view
2. Start typing a skill name (e.g., "Python", "Project Management")
3. Select skills from the dropdown suggestions
4. The chart will automatically highlight members with those skills
5. Non-matching members will be dimmed for easier identification

### 5. Visual Indicators

- **Green Highlight**: Members with matching skills are highlighted with a green border
- **Dimmed Appearance**: Members without matching skills appear faded
- **Result Count**: See how many members match your skill filters

## Technical Details

### Supported File Formats
- **PDF** (.pdf) - Fully supported with text extraction
- **Word Documents** (.doc, .docx) - Coming soon

### File Size Limits
- Maximum file size: 5MB
- Recommended: Keep CVs under 2MB for faster processing

### AI Processing
- Uses OpenAI GPT-4 for intelligent parsing
- Processing typically takes 5-10 seconds
- Extracted data is cached to avoid re-processing

### Data Storage
- Extracted data is stored in Firebase Firestore
- Skills are indexed for fast searching
- CV files remain in Firebase Storage

## Best Practices

### For HR Teams
1. **Bulk Upload**: Process multiple CVs during onboarding
2. **Skill Inventory**: Build a comprehensive skills database
3. **Team Planning**: Use skill search to find expertise for projects

### For Managers
1. **Resource Allocation**: Quickly find team members with specific skills
2. **Skill Gaps**: Identify missing skills in your team
3. **Career Development**: Track skill progression over time

### For Employees
1. **Keep CVs Updated**: Upload new versions as you gain skills
2. **Review Accuracy**: Check that extracted data accurately reflects your expertise
3. **Add Missing Skills**: Manually add any skills the AI might have missed

## Privacy & Security

- **Data Protection**: All CV data is stored securely in Firebase
- **Access Control**: Only authenticated organization members can view CV data
- **Encryption**: Files are encrypted in transit and at rest
- **GDPR Compliant**: Users can request deletion of their CV data

## Troubleshooting

### CV Not Parsing
- Ensure the PDF contains selectable text (not scanned images)
- Check that the file size is under 5MB
- Try re-uploading if the initial parse fails

### Missing Information
- The AI may miss information in unusual formats
- Manually add any missing skills or experience
- Complex layouts may affect extraction accuracy

### Search Not Finding Members
- Ensure members have uploaded and parsed their CVs
- Check for spelling variations in skill names
- Try using more general skill terms

## Future Enhancements

- **Multi-language Support**: Parse CVs in multiple languages
- **Skill Recommendations**: AI-suggested skills based on role and experience
- **Integration with LinkedIn**: Import profiles directly
- **Advanced Analytics**: Organization-wide skill gap analysis
- **Automated Matching**: Suggest team members for projects based on required skills

## API Integration

For developers looking to integrate with the CV parser:

### Endpoint
```
POST /api/cv-parser
```

### Request Body
```json
{
  "cvText": "string",
  "fileType": "pdf" | "doc" | "docx"
}
```

### Response
```json
{
  "success": true,
  "extractedData": {
    "summary": "string",
    "skills": {
      "technical": ["skill1", "skill2"],
      "soft": ["skill1", "skill2"],
      "languages": ["language1 (proficiency)"]
    },
    "experience": [...],
    "education": [...],
    "certifications": [...],
    "achievements": [...]
  }
}
```

---

The AI CV Parser transforms static CV documents into dynamic, searchable data, making it easier to understand and leverage the skills within your organization.