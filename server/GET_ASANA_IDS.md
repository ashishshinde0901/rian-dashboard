# How to Get Asana IDs - Simple Guide

We need 4 IDs from your Asana setup. Follow these steps:

## Step 1: Get Your Personal Access Token

1. Go to: https://app.asana.com/0/my-apps
2. Click "Create new token"
3. Name it: "Daily Email Automation"
4. Click "Create token"
5. **COPY THE TOKEN** (you won't see it again!)
6. This is your `ASANA_ACCESS_TOKEN`

---

## Step 2: Get Workspace, Custom Field, and Option GIDs

### Option A: Use Your Dashboard (Easiest)

1. Make sure your dashboard is running: http://localhost:5173
2. Log in with Asana OAuth
3. Open browser console (press F12)
4. Paste this code and press Enter:

```javascript
// Get workspace GID
const workspace = document.querySelector('[data-workspace-gid]')?.getAttribute('data-workspace-gid');
console.log('=== COPY THESE VALUES ===');
console.log('Workspace GID:', workspace || 'Check network tab for workspace calls');

// Get custom fields
fetch(`http://localhost:3001/api/custom-fields/${workspace}`, {
  credentials: 'include'
})
.then(r => r.json())
.then(data => {
  const functionField = data.find(f => f.name === 'Function' || f.name.toLowerCase().includes('function'));
  if (functionField) {
    console.log('Function Custom Field GID:', functionField.gid);
    const salesOption = functionField.enum_options?.find(o =>
      o.name === 'Sales Initiative' || o.name.toLowerCase().includes('sales')
    );
    if (salesOption) {
      console.log('Sales Initiative Option GID:', salesOption.gid);
    } else {
      console.log('Available options:', functionField.enum_options?.map(o => o.name));
    }
  } else {
    console.log('Available custom fields:', data.map(f => f.name));
  }
  console.log('=== END ===');
})
.catch(err => console.error('Error:', err));
```

5. Copy the 3 GIDs that are printed

### Option B: Use Asana API Directly

If the dashboard method doesn't work, you can use the API directly:

1. Get your Personal Access Token from Step 1
2. Open this URL in your browser (replace YOUR_TOKEN):
   ```
   https://app.asana.com/api/1.0/workspaces
   ```
   Add header: `Authorization: Bearer YOUR_TOKEN`

3. Find your workspace and copy the `gid`

4. Then get custom fields (replace WORKSPACE_GID and YOUR_TOKEN):
   ```
   https://app.asana.com/api/1.0/workspaces/WORKSPACE_GID/custom_fields
   ```

5. Find the "Function" custom field and copy its `gid`

6. In the custom field response, find the enum_options array and locate "Sales Initiative", copy its `gid`

---

## Step 3: Update Environment Variables

Once you have all 4 values, update your `.env` file:

```env
ASANA_ACCESS_TOKEN=<paste your personal access token>
DAILY_EMAIL_WORKSPACE_GID=<paste workspace gid>
DAILY_EMAIL_CUSTOM_FIELD_GID=<paste function field gid>
DAILY_EMAIL_OPTION_GID=<paste sales initiative option gid>
```

---

## Example of what the IDs look like:

```env
ASANA_ACCESS_TOKEN=0/1234567890abcdef1234567890abcdef
DAILY_EMAIL_WORKSPACE_GID=1234567890123456
DAILY_EMAIL_CUSTOM_FIELD_GID=1234567890123456
DAILY_EMAIL_OPTION_GID=1234567890123456
```

---

## ✅ Once you have all 4 IDs, paste them here and I'll:

1. Update the .env file
2. Test the email system
3. Commit and push to production

Just reply with the 4 values!
