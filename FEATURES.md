# OrganiChart - Feature Specifications

A modern organizational chart application that allows users to create, manage, and visualize company hierarchies with Google authentication.

## Features Overview

OrganiChart provides essential functionality for managing organizational structures with the following key features:

- **Google Sign-In Authentication** - Secure authentication using Google OAuth
- **Organization Management** - Create, update, and delete company profiles
- **Member Management** - Add team members with roles and reporting relationships
- **CV/Resume Upload** - Upload and manage CV documents for each team member
- **Interactive Org Chart** - Visual representation of company hierarchy
- **Security Guards** - Protected routes ensuring data security

---

## Feature Specifications

### 1. Google Sign-In (Priority: P1)

**User Story:** _As a user, I want to sign in with my Google account so I can access Organi-chart without creating a new password._

**Acceptance Criteria:**

#### First-time sign-in

- **Given** I'm on `/login` and no account exists for my Google e-mail
- **When** I click "Sign in with Google" and grant consent
- **Then** a user record is created and I'm redirected to `/dashboard` in an authenticated state

#### Returning user

- **Given** an account already exists for my Google e-mail
- **When** I sign in again
- **Then** I'm authenticated and issued a fresh session JWT cookie

#### Cancel / deny consent

- **Given** I'm on the Google consent screen
- **When** I press "Cancel" or "Deny"
- **Then** I'm taken back to `/login` and shown "Google sign-in was cancelled."

#### Log-out

- **Given** I'm logged in
- **When** I click "Log out"
- **Then** the auth cookie is cleared and I'm redirected to `/login` with a toast "You've been logged out."

---

### 2. Manage Organization (Create / Update / Delete) (Priority: P1)

**User Story:** _As an authenticated user, I want to create, rename, or delete a company so I can maintain my organization's profile._

**Acceptance Criteria:**

#### Create

- **Given** I'm logged in and on `/org/new`
- **When** I enter a unique organization name and press "Create"
- **Then** a new organization record is stored and I'm marked as its admin

#### Update

- **Given** an organization exists and I'm its admin
- **When** I change the name/logo and press "Save"
- **Then** the organization record reflects the new data

#### Delete

- **Given** an organization exists and I'm its admin
- **When** I click "Delete" and confirm
- **Then** the organization and all child objects (members, chart) are removed and I'm returned to `/org/select`

---

### 3. Add Member (Priority: P1)

**User Story:** _As an org admin, I want to add a person (name, picture, role, e-mail) and optionally set their manager so the chart stays current._

**Acceptance Criteria:**

#### Add member

- **Given** I'm on `/org/{id}/members/new`
- **When** I supply name, role, e-mail (unique within org), photo and pick an optional manager
- **Then** the member appears in the database and in the org chart under the chosen manager

#### Validation

- **Given** I enter an e-mail that already exists in the org
- **Then** I receive "E-mail already in use" and the member is not saved

---

### 4. View Org Chart (Priority: P1)

**User Story:** _As any logged-in user, I want to see the organizational chart with reporting lines so I understand the hierarchy._

**Acceptance Criteria:**

#### Render chart

- **Given** there are members with manager relationships
- **When** I open `/org/{id}/chart`
- **Then** each member is displayed as a node showing picture, name, role, e-mail, and a thin line connects them to their direct superior

#### Empty state

- **Given** the organization has no members
- **Then** I see a prompt "No members yet — add one to start your chart."

---

### 5. Auth Guard (Redirect if not signed in) (Priority: P1)

**User Story:** _As a user, I must be signed in to access any protected page so that organization data stays secure._

**Acceptance Criteria:**

- **Given** I am **not** authenticated
- **When** I attempt to reach any route other than `/login` or `/oauth/**`
- **Then** I am redirected to `/login` with the message "Please sign in."

---

## Route Structure

Based on the feature specifications, the application includes the following key routes:

- `/login` - Authentication page
- `/dashboard` - Main dashboard after login
- `/org/new` - Create new organization
- `/org/select` - Organization selection page
- `/org/{id}/chart` - View organizational chart
- `/org/{id}/members/new` - Add new member
- `/oauth/**` - OAuth authentication endpoints

---

## Security Features

- JWT-based session management
- Google OAuth integration
- Route protection for authenticated users only
- Organization-level data isolation
- Admin-only organization management

---

### 6. CV/Resume Upload & Management (Priority: P1)

**User Story:** _As an org admin, I want to upload and manage CV/resume documents for team members so that I can maintain comprehensive employee records and allow easy access to member qualifications._

**Acceptance Criteria:**

#### Upload CV during member creation

- **Given** I'm adding a new member on `/org/{id}/members/new`
- **When** I upload a PDF, DOC, or DOCX file in the CV section (max 10MB)
- **Then** the CV is stored in Firebase Storage and linked to the member record

#### Manage existing member CVs

- **Given** I'm editing a member and they have an existing CV
- **When** I choose to replace, remove, or add a CV
- **Then** the changes are saved and old files are properly cleaned up

#### Download member CVs

- **Given** a member has an uploaded CV
- **When** I click the CV download button
- **Then** the CV file downloads with a descriptive filename

#### File validation

- **Given** I attempt to upload an invalid file (wrong type or too large)
- **Then** I receive a clear error message and the upload is rejected

#### Automatic cleanup

- **Given** a member with a CV is deleted
- **Then** their CV file is automatically removed from storage

---

## Development Status

All features listed above are **Priority 1 (P1)** and represent the core functionality required for the minimum viable product.
