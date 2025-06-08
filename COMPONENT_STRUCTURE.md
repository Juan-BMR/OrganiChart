# OrganiChart - Component Tree Structure

## App Structure

```
src/
├── app.html
├── app.css
├── routes/
│   ├── +layout.svelte                 # Root layout with auth checks
│   ├── +layout.server.js              # Server-side auth validation
│   ├── login/
│   │   └── +page.svelte               # Login screen
│   ├── dashboard/
│   │   └── +page.svelte               # Organizations dashboard
│   ├── org/
│   │   └── [id]/
│   │       └── chart/
│   │           └── +page.svelte       # Organization chart view
│   └── auth/
│       └── callback/
│           └── +page.server.js        # OAuth callback handler
├── lib/
│   ├── components/
│   │   ├── ui/
│   │   │   ├── Button.svelte          # Reusable button component
│   │   │   ├── Modal.svelte           # Modal wrapper component
│   │   │   ├── Input.svelte           # Form input component
│   │   │   ├── FileUpload.svelte      # Drag-and-drop file upload
│   │   │   └── Dropdown.svelte        # Select dropdown component
│   │   ├── layout/
│   │   │   ├── Header.svelte          # Floating header with user info
│   │   │   └── AuthGuard.svelte       # Authentication wrapper
│   │   ├── org/
│   │   │   ├── OrganizationCard.svelte      # Organization card component
│   │   │   ├── CreateOrgModal.svelte        # Create organization modal
│   │   │   └── OrganizationGrid.svelte      # Grid of organization cards
│   │   ├── chart/
│   │   │   ├── OrgChart.svelte              # Main org chart container
│   │   │   ├── ChartNode.svelte             # Individual member node
│   │   │   ├── ChartLines.svelte            # Connecting lines between nodes
│   │   │   └── AddMemberModal.svelte        # Add member modal
│   │   └── auth/
│   │       └── GoogleSignIn.svelte          # Google OAuth button
│   ├── stores/
│   │   ├── auth.js                    # Authentication state
│   │   ├── organizations.js           # Organizations data
│   │   └── members.js                 # Members data
│   ├── utils/
│   │   ├── api.js                     # API client functions
│   │   ├── auth.js                    # Auth helper functions
│   │   └── chart.js                   # Chart layout calculations
│   └── types/
│       └── index.js                   # TypeScript-style JSDoc types
```

## Component Hierarchy

### 1. Layout Components

- `+layout.svelte` - Root layout with auth state management
- `Header.svelte` - Floating header (user avatar, logout)
- `AuthGuard.svelte` - Route protection wrapper

### 2. Page Components

- `login/+page.svelte` - Login screen with Google OAuth
- `dashboard/+page.svelte` - Organizations dashboard
- `org/[id]/chart/+page.svelte` - Organization chart view

### 3. Feature Components

- `OrganizationCard.svelte` - Individual org card
- `OrganizationGrid.svelte` - Grid layout for org cards
- `OrgChart.svelte` - Main chart visualization
- `ChartNode.svelte` - Individual member node
- `ChartLines.svelte` - SVG connecting lines

### 4. Modal Components

- `Modal.svelte` - Base modal wrapper
- `CreateOrgModal.svelte` - Organization creation form
- `AddMemberModal.svelte` - Member addition form

### 5. UI Components

- `Button.svelte` - Styled buttons (primary, secondary)
- `Input.svelte` - Form input fields
- `FileUpload.svelte` - Drag-and-drop file upload
- `Dropdown.svelte` - Select dropdown for manager selection

### 6. Auth Components

- `GoogleSignIn.svelte` - Google OAuth integration

## Data Flow

1. **Auth Store** - Manages user authentication state
2. **Organizations Store** - Handles organization CRUD operations
3. **Members Store** - Manages member data and hierarchy
4. **API Utils** - Server communication functions
5. **Chart Utils** - Layout and positioning calculations
