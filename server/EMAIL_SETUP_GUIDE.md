# Email Setup Guide - Step by Step

## 📧 Where to Get Email Service Information

### Option 1: Using Gmail (Recommended - Easiest Setup)

#### Step 1: Choose Your Gmail Account
- Use any Gmail account you have access to
- This will be the "sender" email for daily reports
- Example: `yourbusiness@gmail.com` or your personal Gmail

#### Step 2: Enable 2-Factor Authentication (If Not Already)
1. Go to: https://myaccount.google.com/security
2. Scroll down to "2-Step Verification"
3. Click "Get Started" and follow the prompts
4. **Note:** This is required to create app passwords

#### Step 3: Generate App Password
1. Go to: https://myaccount.google.com/apppasswords
2. If you don't see this option, make sure 2-Step Verification is enabled first
3. Click on "Select app" → Choose **"Mail"**
4. Click on "Select device" → Choose **"Other (Custom name)"**
5. Enter name: **"Asana Dashboard"**
6. Click **"Generate"**
7. **COPY THE 16-CHARACTER PASSWORD** (looks like: `abcd efgh ijkl mnop`)
   - You won't be able to see it again!
   - Spaces don't matter when copying

#### Step 4: Your Email Configuration
```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=youremail@gmail.com           # Your Gmail address
EMAIL_PASSWORD=abcdefghijklmnop           # The 16-char password from Step 3 (remove spaces)
RECIPIENT_EMAILS=recipient1@company.com,recipient2@company.com  # Who receives the daily email
```

---

### Option 2: Using Company Email (G Suite / Google Workspace)

If your company uses Google Workspace (paid Gmail for business):

#### Same steps as Gmail above, but:
```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=yourname@yourcompany.com       # Your company email
EMAIL_PASSWORD=abcdefghijklmnop            # App password
RECIPIENT_EMAILS=management@yourcompany.com
```

---

### Option 3: Using Other Email Providers

#### Microsoft Outlook / Office 365:
```env
EMAIL_HOST=smtp.office365.com
EMAIL_PORT=587
EMAIL_USER=yourname@outlook.com
EMAIL_PASSWORD=your-password
RECIPIENT_EMAILS=recipient@company.com
```

#### Yahoo Mail:
```env
EMAIL_HOST=smtp.mail.yahoo.com
EMAIL_PORT=587
EMAIL_USER=yourname@yahoo.com
EMAIL_PASSWORD=your-app-password
RECIPIENT_EMAILS=recipient@company.com
```

---

## 👥 Recipient Emails - Who Gets the Daily Report?

`RECIPIENT_EMAILS` is a comma-separated list of people who will receive the daily intelligence email.

### Examples:

**Single recipient:**
```env
RECIPIENT_EMAILS=ceo@company.com
```

**Multiple recipients:**
```env
RECIPIENT_EMAILS=ceo@company.com,founder@company.com,management@company.com
```

**Important:**
- No spaces after commas
- Use real email addresses that can receive mail
- Test with your own email first before adding others

---

## 🧪 Quick Test

After setting up, you can test if email sending works:

1. Set up the environment variables locally in `.env` file
2. Start the server: `npm run dev`
3. Use the preview endpoint to see how the email looks (won't send):
   ```
   http://localhost:3001/api/email/preview-daily-update?workspaceGid=XXX&customFieldGid=XXX&optionGid=XXX
   ```

---

## ❓ FAQ

### Q: Do I need a special email account?
**A:** No! You can use any Gmail account you already have. Even a personal Gmail works fine.

### Q: Will this expose my regular Gmail password?
**A:** No! You create a separate "app password" that's different from your regular password. This is more secure.

### Q: Can I change the sender email later?
**A:** Yes! Just update the `EMAIL_USER` and `EMAIL_PASSWORD` environment variables and redeploy.

### Q: What if I don't have Gmail?
**A:** You can use any email provider, but Gmail is easiest to set up. For others, you'll need to find their SMTP settings.

### Q: Can I test without sending real emails?
**A:** Yes! Use the preview endpoint which shows you the HTML email without sending it.

---

## 🎯 Recommendation

**For easiest setup:**
1. Use Gmail (either personal or company G Suite)
2. Send test emails to yourself first
3. Once verified, add other recipients

**Email configuration is just:**
- Your Gmail address
- An app password (16 characters from Google)
- Who should receive the daily reports

That's it! 🚀
