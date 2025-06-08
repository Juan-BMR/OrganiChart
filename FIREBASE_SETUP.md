# Firebase Setup Guide for OrganiChart

## 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project" or "Add project"
3. Enter project name: `organichart` (or your preferred name)
4. Choose whether to enable Google Analytics (optional)
5. Click "Create project"

## 2. Enable Authentication

1. In Firebase Console, go to **Authentication**
2. Click "Get started"
3. Go to **Sign-in method** tab
4. Enable **Google** provider:
   - Click on Google
   - Toggle "Enable"
   - Add your project support email
   - Click "Save"

## 3. Create Firestore Database

1. Go to **Firestore Database**
2. Click "Create database"
3. Choose **production mode** (we'll set custom rules)
4. Select your preferred location
5. Click "Done"

## 4. Set up Firestore Collections

### Crd

### Set up Indexes:

Go to **Firestore** → **Indexes** → **Composite** and create:

```
Collection: members
Fields: organizationId (Ascending), isActive (Ascending)

Collection: members
Fields: organizationId (Ascending), managerId (Ascending)

Collection: members
Fields: organizationId (Ascending), email (Ascending)

Collection: organization_permissions
Fields: userId (Ascending), organizationId (Ascending)

Collection: organization_permissions
Fields: organizationId (Ascending), role (Ascending)

Collection: organizations
Fields: ownerId (Ascending), createdAt (Descending)
```

## 5. Deploy Security Rules

1. Go to **Firestore** → **Rules**
2. Copy the content from `firestore.rules` in this project
3. Click "Publish"

## 6. Enable Storage (for images)

1. Go to **Storage**
2. Click "Get started"
3. Choose **production mode**
4. Select same location as Firestore
5. Click "Done"

## 7. Get Configuration Keys

### For Client SDK:

1. Go to **Project settings** (gear icon)
2. Scroll to "Your apps" section
3. Click "Add app" → Web app
4. Register app with nickname: "OrganiChart Web"
5. Copy the config object values to your `.env` file:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### For Admin SDK:

1. Go to **Project settings** → **Service accounts**
2. Click "Generate new private key"
3. Download the JSON file
4. Extract these values to your `.env` file:

```env
FIREBASE_ADMIN_PROJECT_ID=your_project_id
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your_project.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"
```

## 8. Configure OAuth Authorized Domains

1. Go to **Authentication** → **Settings** → **Authorized domains**
2. Add your development domain: `localhost` (should be there by default)
3. Add your production domain when you deploy

## 9. Test the Setup

1. Create `.env` file with your keys
2. Run `npm run dev`
3. Try signing in with Google
4. Check Firestore to see if user document was created

## 🚨 Important Notes

- **Never commit** your `.env` file to version control
- The `FIREBASE_ADMIN_PRIVATE_KEY` should be the full private key including newlines
- All client-side config keys (VITE\_\*) are safe to expose in the browser
- Admin SDK keys should only be used server-side

## 📊 Collection Structure Summary

```
users/{userId}
organizations/{orgId}
members/{memberId}
organization_permissions/{userId}_{orgId}
```

This setup provides secure, scalable data structure for OrganiChart!
