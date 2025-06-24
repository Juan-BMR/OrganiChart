# Firebase Service Account Key Setup Guide

## Getting the Service Account Key

### 1. Access Firebase Console
- Go to [Firebase Console](https://console.firebase.google.com)
- Select your OrganiChart project

### 2. Generate Service Account Key
1. Click the **gear icon** ⚙️ next to "Project Overview"
2. Select **Project settings**
3. Navigate to the **Service accounts** tab
4. Click **Generate new private key**
5. Confirm by clicking **Generate key**
6. Save the downloaded JSON file securely

## Setting Up the Key

### For Local Development

1. **Create a `.env` file** in your project root:
   ```bash
   touch .env
   ```

2. **Convert JSON to single line**:
   - Open the downloaded JSON file
   - Remove all line breaks and extra spaces
   - Or use this command:
   ```bash
   # On Mac/Linux
   echo "FIREBASE_SERVICE_ACCOUNT_KEY='$(cat ~/Downloads/your-service-account-key.json | jq -c .)'" >> .env
   
   # On Windows (PowerShell)
   $json = Get-Content ~/Downloads/your-service-account-key.json | ConvertFrom-Json | ConvertTo-Json -Compress
   Add-Content .env "FIREBASE_SERVICE_ACCOUNT_KEY='$json'"
   ```

3. **Manual method** (if you don't have jq):
   - Copy the entire JSON content
   - Wrap it in single quotes
   - Add to `.env` file:
   ```env
   FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"your-project",...}'
   ```

### For Production Deployment

#### Vercel
1. Go to your project dashboard
2. Navigate to Settings → Environment Variables
3. Add `FIREBASE_SERVICE_ACCOUNT_KEY`
4. Paste the single-line JSON string (without quotes)

#### Netlify
1. Go to Site settings → Environment variables
2. Add new variable `FIREBASE_SERVICE_ACCOUNT_KEY`
3. Paste the single-line JSON string

#### Firebase Hosting
1. Use Firebase Functions configuration:
   ```bash
   firebase functions:config:set service_account.key="$(cat service-account-key.json | jq -c .)"
   ```

#### Other Platforms
- **Heroku**: `heroku config:set FIREBASE_SERVICE_ACCOUNT_KEY='...'`
- **AWS**: Use AWS Secrets Manager or Parameter Store
- **Google Cloud**: Use Secret Manager

## Security Best Practices

### ⚠️ IMPORTANT Security Notes

1. **Never commit the key to Git**
   - `.env` is already in `.gitignore`
   - Never commit the JSON file

2. **Restrict key permissions**
   - Only grant necessary permissions
   - Use different keys for dev/staging/production

3. **Rotate keys regularly**
   - Delete old keys from Firebase Console
   - Generate new keys periodically

4. **Monitor key usage**
   - Check Firebase Console for unusual activity
   - Set up alerts for suspicious behavior

## Troubleshooting

### Common Issues

1. **"Failed to initialize Firebase Admin"**
   - Check if the JSON is properly formatted
   - Ensure no extra quotes or escaping issues
   - Verify the key hasn't been revoked

2. **"Invalid JSON"**
   - Make sure the JSON is on a single line
   - Check for proper quote escaping
   - Use a JSON validator

3. **"Permission denied"**
   - Verify the service account has necessary permissions
   - Check Firebase project settings

### Testing the Setup

1. **Run the development server**:
   ```bash
   npm run dev
   ```

2. **Visit an organization page**:
   ```
   http://localhost:5173/org/[your-org-id]/chart
   ```

3. **Check the page source** for meta tags

4. **Test the OG image endpoint**:
   ```
   http://localhost:5173/api/og-image/[your-org-id]
   ```

## Alternative: Using Default Credentials

If deploying to Google Cloud services (Cloud Run, App Engine, etc.):
- You might not need the service account key
- The app can use default credentials
- Just ensure the service has the right IAM roles

## Need Help?

- Check Firebase documentation on [Admin SDK setup](https://firebase.google.com/docs/admin/setup)
- Review your Firebase project permissions
- Ensure Firestore security rules allow admin access