# 📚 Tallie - Complete Setup & User Guide

<div align="center">

![Tallie Logo](./assets/icon.png)

**Modern Desktop App with Google OAuth Authentication**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Electron](https://img.shields.io/badge/Electron-35.0.2-47848F?logo=electron)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/React-19.0.0-61DAFB?logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8.2-3178C6?logo=typescript)](https://www.typescriptlang.org/)

**Simple enough for students, powerful enough for developers**

</div>

---

## 📖 Table of Contents

- [What is Tallie?](#-what-is-tallie)
- [Quick Start (10 Minutes)](#-quick-start-10-minutes)
- [Complete Setup Guide](#-complete-setup-guide)
  - [Prerequisites](#1-prerequisites)
  - [Installation](#2-installation)
  - [Google OAuth Setup](#3-google-oauth-setup)
  - [Running the App](#4-running-the-app)
  - [Building Production](#5-building-production)
- [Common Problems & Solutions](#-common-problems--solutions)
- [Understanding the Code](#-understanding-the-code)
- [Tech Stack](#-tech-stack)
- [Available Commands](#-available-commands)
- [Learning Resources](#-learning-resources)

---

## 🎯 What is Tallie?

**Tallie** is a desktop application (like WhatsApp Desktop or Spotify) that helps you:
- Login with Google (like "Sign in with Google" on websites)
- Upload and manage files
- View and manage your profile

Think of it as a simple desktop app that connects to the internet!

### **Features:**
- 🔐 **Google OAuth Authentication** - Secure login with your Google account
- 📤 **File Upload** - Upload and process CSV files
- 👤 **Profile Management** - View and manage user information
- 🎨 **Modern UI** - Beautiful, responsive interface
- 🔒 **Secure** - Built with security best practices
- 🚀 **Fast** - Optimized performance

---

## ⚡ Quick Start (10 Minutes)

> **Want to get running fast?** Follow these essential steps!

### **Step 1: Install Node.js** (2 min)
1. Go to: https://nodejs.org/
2. Download and install the LTS version
3. Verify: Open Terminal and type `node --version`

### **Step 2: Setup Code** (2 min)
```bash
cd Desktop
git clone <your-repo-url>
cd electron_Tallie
npm install
```
⏳ Wait 2-3 minutes for installation...

### **Step 3: Configure** (3 min)
```bash
# Create config file
cp .env.example .env
```

**Edit `.env` file and add:**
```bash
SUPABASE_STAGING_URL=https://mtxrobrwanikajymnkaf.supabase.co
SUPABASE_STAGING_ANON_KEY=your-key-here
```

### **Step 4: Setup Google OAuth** (3 min)

**A. Google Cloud Console:**
1. Go to: https://console.cloud.google.com/
2. Create project → Name: "Tallie"
3. APIs & Services → Credentials → Create OAuth 2.0 Client
4. Add redirect URI: `https://mtxrobrwanikajymnkaf.supabase.co/auth/v1/callback`
5. Copy Client ID and Secret

**B. Supabase:**
1. Go to: https://app.supabase.com/
2. Create project → Name: "Tallie"
3. Authentication → Providers → Enable Google
4. Paste Client ID and Secret
5. Add redirect URL: `tallie://oauth/callback`

### **Step 5: Run!** (30 sec)
```bash
npm start
```
⏳ Wait 10-20 seconds... App opens! 🎉

### **Quick Test:**
1. Click "Continue with Google"
2. Login with Google
3. You're in! ✅

---

## 📚 Complete Setup Guide

> **For detailed understanding, follow this comprehensive guide**

---

## 1️⃣ Prerequisites

### **Software You Need:**

#### **Node.js** (Required)
- **What is it?** A program that runs JavaScript on your computer
- **Download:** https://nodejs.org/
- **Version:** 18.0.0 or higher
- **Check installation:**
  ```bash
  node --version  # Should show v18.x.x or higher
  npm --version   # Should show 9.x.x or higher
  ```

#### **Git** (Required)
- **What is it?** A tool to download and manage code
- **Download:** https://git-scm.com/
- **Check installation:**
  ```bash
  git --version  # Should show git version 2.x.x
  ```

#### **Code Editor** (Recommended)
- **VS Code:** https://code.visualstudio.com/
- **Or any text editor** you prefer

### **Accounts You Need:**

1. **Google Account** - For OAuth login
2. **Supabase Account** - Free database service (https://supabase.com/)

---

## 2️⃣ Installation

### **Step 1: Download the Code**

```bash
# Navigate to where you want the project
cd Desktop

# Clone the repository
git clone <your-repository-url>

# Enter the project folder
cd electron_Tallie
```

**What this does:** Downloads all the app code to your computer

### **Step 2: Install Dependencies**

```bash
npm install
```

**What this does:** Downloads all the tools and libraries the app needs

**Wait time:** 2-5 minutes (be patient!)

**You'll see:** Lots of text scrolling - that's normal!

### **Step 3: Create Environment File**

```bash
# Copy the example file
cp .env.example .env
```

**What this does:** Creates a file to store secret information (like API keys)

⚠️ **Important:** Never share your `.env` file with anyone!

---

## 3️⃣ Google OAuth Setup

> **This is the most important part - follow carefully!**

### **Part A: Google Cloud Console Setup**

#### **1. Create Google Cloud Project**

1. **Go to:** https://console.cloud.google.com/
2. **Login** with your Google account
3. **Click** "Select a project" at the top
4. **Click** "New Project"
5. **Name:** "Tallie App"
6. **Click** "Create"
7. **Wait** for project creation (10-20 seconds)

#### **2. Configure OAuth Consent Screen**

1. **Go to:** APIs & Services → OAuth consent screen
2. **User Type:** Choose "External"
3. **Click** "Create"
4. **Fill in:**
   - App name: `Tallie`
   - User support email: (your email)
   - Developer contact: (your email)
5. **Click** "Save and Continue"
6. **Scopes:** Skip this page, click "Save and Continue"
7. **Test users:** Add yourself, click "Save and Continue"
8. **Summary:** Click "Back to Dashboard"

#### **3. Create OAuth Credentials**

1. **Go to:** APIs & Services → Credentials
2. **Click** "Create Credentials" → "OAuth 2.0 Client ID"
3. **Application type:** Web application
4. **Name:** "Tallie Desktop App"

5. **Add Authorized JavaScript origins:**
   ```
   https://mtxrobrwanikajymnkaf.supabase.co
   ```

6. **Add Authorized redirect URIs:**
   ```
   https://mtxrobrwanikajymnkaf.supabase.co/auth/v1/callback
   ```

   ⚠️ **IMPORTANT:** Do NOT add `tallie://oauth/callback` here!

7. **Click** "Create"

8. **Copy your credentials:**
   - Client ID (looks like: `123456789-abc.apps.googleusercontent.com`)
   - Client Secret (looks like: `GOCSPX-abc123xyz`)
   
   📝 **Save these** - you'll need them in the next step!

### **Part B: Supabase Setup**

#### **1. Create Supabase Project**

1. **Go to:** https://app.supabase.com/
2. **Login** or create account
3. **Click** "New Project"
4. **Fill in:**
   - Name: `Tallie`
   - Database Password: (create a strong password)
   - Region: Choose closest to you
5. **Click** "Create new project"
6. **Wait** 2-3 minutes for setup

#### **2. Enable Google Authentication**

1. **Go to:** Authentication → Providers
2. **Find** "Google" in the list
3. **Toggle** "Enable Sign in with Google" to ON
4. **Paste:**
   - Client ID (from Google Cloud Console)
   - Client Secret (from Google Cloud Console)
5. **Click** "Save"

#### **3. Configure Redirect URLs**

1. **Still in** Authentication settings
2. **Find** "URL Configuration" section
3. **Add to "Redirect URLs":**
   ```
   tallie://oauth/callback
   ```
4. **Make sure** it's the FIRST URL in the list
5. **Click** "Save"

#### **4. Get Supabase Credentials**

1. **Go to:** Settings → API
2. **Copy:**
   - Project URL (looks like: `https://xxx.supabase.co`)
   - anon public key (long string of letters/numbers)

### **Part C: Update .env File**

Open the `.env` file in your code editor and update:

```bash
# Supabase Configuration
SUPABASE_STAGING_URL=https://mtxrobrwanikajymnkaf.supabase.co
SUPABASE_STAGING_ANON_KEY=your-anon-key-from-supabase-here

# Replace 'your-anon-key-from-supabase-here' with your actual key!
```

**Save the file!** (Cmd+S or Ctrl+S)

---

## 4️⃣ Running the App

### **Development Mode** (for testing)

```bash
npm start
```

**What happens:**
1. Terminal shows lots of text (that's normal!)
2. A webpack server starts
3. After 10-20 seconds, the app window opens
4. You'll see the login page

**To stop the app:** Press `Ctrl + C` in Terminal

### **Testing Google Login**

1. **Click** "Continue with Google" button
2. **Browser opens** automatically
3. **Choose** your Google account
4. **Click** "Allow" to grant permissions
5. **Browser shows** "Success! You can close this window"
6. **Go back** to the app
7. **You should see** the Upload page - you're logged in! 🎉

### **Testing Logout**

1. **Click** "Logout" button (top right)
2. **You should see** "Logged out successfully" message
3. **Redirected** back to login page

### **Testing Upload**

1. **Login** with Google
2. **Click** "Choose File" or drag & drop a CSV file
3. **Click** "Upload"
4. **File processes** and uploads to server

---

## 5️⃣ Building Production

### **Create Production Version**

```bash
npm run package
```

**What this does:**
- Compiles all code
- Creates optimized bundles
- Packages into a standalone app
- Creates installers

**Wait time:** 3-5 minutes

**Output location:**
```
release/build/mac/Tallie.app          # macOS (Intel)
release/build/mac-arm64/Tallie.app    # macOS (Apple Silicon)
```

### **Running Production Build**

```bash
# For Intel Mac
open release/build/mac/Tallie.app

# For Apple Silicon Mac (M1/M2/M3)
open release/build/mac-arm64/Tallie.app
```

**Or:** Just double-click the app in Finder!

### **Distributing the App**

The `.dmg` files in `release/build/` can be shared:
```
Tallie-4.6.0.dmg              # Intel Mac
Tallie-4.6.0-arm64.dmg        # Apple Silicon Mac
```

---

## 🐛 Common Problems & Solutions

### **Problem 1: "npm: command not found"**

**Cause:** Node.js is not installed or not in PATH

**Solution:**
```bash
# Install Node.js from https://nodejs.org/
# Restart Terminal after installation
node --version  # Verify installation
```

---

### **Problem 2: Blank White Screen**

**Cause:** JavaScript error or missing files

**Solution:**
```bash
# Open DevTools to see errors
# When app opens, press: Cmd + Option + I
# Check Console tab for red errors
```

**Common fixes:**
- Check `.env` file has correct values
- Restart the app: `Ctrl+C` then `npm start`
- Clear cache: `rm -rf node_modules && npm install`

---

### **Problem 3: "Continue with Google" Button Stuck on "Loading..."**

**Cause:** OAuth configuration issue

**Solution - Check these:**

1. **Supabase Google provider enabled?**
   - Go to Supabase → Authentication → Providers
   - Google should be ON

2. **Correct redirect URLs?**
   - Supabase should have: `tallie://oauth/callback`
   - Google should have: `https://mtxrobrwanikajymnkaf.supabase.co/auth/v1/callback`

3. **Correct credentials in .env?**
   - Check SUPABASE_STAGING_URL
   - Check SUPABASE_STAGING_ANON_KEY

**Quick fix:**
```bash
# Restart the app
Ctrl + C
npm start
```

---

### **Problem 4: "OAuth callback with invalid state"**

**Cause:** Redirect URL not first in Supabase list

**Solution:**
1. Go to Supabase Dashboard
2. Authentication → URL Configuration
3. Make sure `tallie://oauth/callback` is FIRST in the list
4. Save and restart app

---

### **Problem 5: OAuth Opens in New Window**

**Cause:** Protocol handler not registered properly in dev mode

**Solution:** Use production build
```bash
npm run package
open release/build/mac/Tallie.app
```

**Why:** Production builds handle protocol registration better

---

### **Problem 6: "Cannot find module" Error**

**Cause:** Dependencies not installed properly

**Solution:**
```bash
# Clean install
rm -rf node_modules
rm package-lock.json
npm install
```

---

### **Problem 7: Port Already in Use**

**Error:** `Port 1212 is already in use`

**Solution:**
```bash
# Find and kill the process
lsof -ti:1212 | xargs kill -9

# Or use a different port
PORT=3000 npm start
```

---

### **Problem 8: Build Fails**

**Common causes:**
- Not enough disk space
- Node version too old
- Missing dependencies

**Solution:**
```bash
# Check Node version (should be 18+)
node --version

# Check disk space
df -h

# Clean and rebuild
rm -rf release
npm run package
```

---

## 💡 Understanding the Code

### **Project Structure**

```
electron_Tallie/
├── src/
│   ├── main/                    # Main process (background)
│   │   ├── main.ts             # App entry point
│   │   ├── oauth/              # OAuth handling
│   │   │   ├── OAuthManager.ts # OAuth flow manager
│   │   │   └── DeepLinkHandler.ts # Protocol handler
│   │   ├── preload.ts          # Bridge between main/renderer
│   │   └── util.ts             # Helper functions
│   │
│   ├── renderer/                # Renderer process (UI)
│   │   ├── App.tsx             # Main app component
│   │   ├── index.tsx           # React entry point
│   │   ├── pages/              # Different screens
│   │   │   ├── Login/          # Login page
│   │   │   ├── Upload/         # Upload page
│   │   │   └── Profile/        # Profile page
│   │   ├── contexts/           # React contexts
│   │   │   └── AuthContext.tsx # Auth state management
│   │   └── components/         # Reusable components
│   │       └── ErrorBoundary.tsx # Error handling
│   │
│   ├── lib/                     # Shared libraries
│   │   ├── supabase/           # Supabase integration
│   │   │   ├── client.ts       # Supabase client
│   │   │   └── auth.ts         # Auth service
│   │   └── api/                # API client
│   │       └── apiClient.ts    # HTTP client
│   │
│   └── config/                  # Configuration
│       └── supabase.ts         # Supabase config
│
├── assets/                      # Images and icons
│   ├── icon.png                # App icon
│   └── entitlements.mac.plist  # macOS permissions
│
├── .erb/                        # Electron React Boilerplate
│   ├── configs/                # Webpack configs
│   └── scripts/                # Build scripts
│
├── .env                         # Environment variables (SECRET!)
├── .env.example                # Example env file
├── package.json                # Dependencies and scripts
├── tsconfig.json               # TypeScript config
└── README.md                   # This file!
```

### **How Login Works** (Simple Explanation)

```
1. User clicks "Continue with Google"
   ↓
2. App calls signInWithGoogle()
   ↓
3. IPC message sent to main process
   ↓
4. Main process opens browser with Google login
   ↓
5. User logs in with Google
   ↓
6. Google redirects to Supabase with auth code
   ↓
7. Supabase validates code and creates session
   ↓
8. Supabase redirects to tallie://oauth/callback
   ↓
9. Protocol handler catches the callback
   ↓
10. Tokens extracted from URL
   ↓
11. Tokens sent to renderer process
   ↓
12. AuthContext updates with user session
   ↓
13. User redirected to Upload page
   ↓
14. User is logged in! 🎉
```

### **Important Files Explained**

#### **`.env`** - Secret Configuration
```bash
# Like a locked diary with passwords
# Never share this file!
# Contains API keys and URLs
```

#### **`package.json`** - App Information
```json
{
  "name": "tallie",
  "version": "4.6.0",
  "scripts": {
    "start": "Run development server",
    "package": "Build production app"
  },
  "dependencies": {
    // All the tools the app needs
  }
}
```

#### **`src/main/main.ts`** - App Brain
- Starts the Electron app
- Creates the window
- Registers protocol handler
- Handles OAuth callbacks
- Manages IPC communication

#### **`src/renderer/App.tsx`** - Main UI
- Decides which page to show
- Handles navigation
- Wraps app in providers
- Manages routing

#### **`src/lib/supabase/auth.ts`** - Auth Manager
- Handles Google login
- Manages sessions
- Saves login status
- Handles logout
- Refreshes tokens

#### **`src/renderer/contexts/AuthContext.tsx`** - Auth State
- Provides auth state to all components
- Manages user data
- Handles loading states
- Triggers re-renders on auth changes

---

## 🛠 Tech Stack

### **Frontend**
- **Electron** 35.0.2 - Desktop app framework
- **React** 19.0.0 - UI library
- **TypeScript** 5.8.2 - Type-safe JavaScript
- **React Router** 7.3.0 - Navigation
- **TailwindCSS** 4.1.14 - Styling
- **React Hot Toast** - Notifications

### **Backend Integration**
- **Supabase** - Authentication & database
- **Axios** - HTTP client
- **FastAPI** - Backend API (separate service)

### **Development Tools**
- **Webpack** 5.98.0 - Module bundler
- **Electron Builder** 25.1.8 - App packager
- **ESLint** - Code linting
- **Prettier** - Code formatting

### **Build Tools**
- **electron-builder** - Creates installers
- **webpack-dev-server** - Development server
- **ts-node** - TypeScript execution

---

## 📝 Available Commands

### **Development**

```bash
# Start development server
npm start

# Start with specific port
PORT=3000 npm start

# Start with debugging
DEBUG=* npm start
```

### **Building**

```bash
# Build production app
npm run package

# Build for specific platform
npm run package -- --mac
npm run package -- --win
npm run package -- --linux

# Build without packaging
npm run build
```

### **Code Quality**

```bash
# Run linter
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format
```

### **Cleaning**

```bash
# Clean build files
npm run clean

# Clean and reinstall
rm -rf node_modules package-lock.json
npm install
```

---

## 🎓 Learning Resources

### **If You Want to Learn More:**

#### **JavaScript Basics**
- https://javascript.info/ - Complete JavaScript guide
- https://www.freecodecamp.org/ - Free coding courses

#### **React Tutorial**
- https://react.dev/learn - Official React docs
- https://www.youtube.com/watch?v=SqcY0GlETPk - React crash course

#### **Electron Guide**
- https://www.electronjs.org/docs/latest/tutorial/tutorial-prerequisites
- https://www.youtube.com/watch?v=ML743nrkMHw - Electron tutorial

#### **TypeScript**
- https://www.typescriptlang.org/docs/handbook/intro.html
- https://www.typescripttutorial.net/

#### **OAuth 2.0**
- https://oauth.net/2/ - OAuth specification
- https://www.youtube.com/watch?v=996OiexHze0 - OAuth explained

---

## 💡 Tips for Success

### **1. Read Error Messages Carefully**
- They tell you what's wrong!
- Google the error message if stuck
- Check Stack Overflow

### **2. Use DevTools**
- Press `Cmd + Option + I` to open
- Console tab shows errors
- Network tab shows requests
- Elements tab shows HTML/CSS

### **3. Save Your Work**
- Always save files before testing
- Use `Cmd + S` (Mac) or `Ctrl + S` (Windows)
- Git commit regularly

### **4. Restart When Stuck**
- Close app
- Stop Terminal (`Ctrl + C`)
- Run `npm start` again
- Often fixes mysterious issues!

### **5. Keep Dependencies Updated**
```bash
# Check for updates
npm outdated

# Update packages
npm update
```

### **6. Use Version Control**
```bash
# Create a branch for new features
git checkout -b feature-name

# Commit your changes
git add .
git commit -m "Description of changes"

# Push to remote
git push origin feature-name
```

---

## ✅ Setup Checklist

Use this to verify everything is configured:

### **Installation Checklist:**
- [ ] Node.js installed (`node --version` works)
- [ ] Git installed (`git --version` works)
- [ ] Code downloaded (`git clone` completed)
- [ ] Dependencies installed (`npm install` completed)
- [ ] `.env` file created

### **Google OAuth Checklist:**
- [ ] Google Cloud project created
- [ ] OAuth consent screen configured
- [ ] OAuth credentials created
- [ ] Client ID and Secret copied
- [ ] Redirect URIs added to Google

### **Supabase Checklist:**
- [ ] Supabase project created
- [ ] Google provider enabled
- [ ] Client ID and Secret added to Supabase
- [ ] Redirect URL `tallie://oauth/callback` added
- [ ] Project URL and anon key copied
- [ ] `.env` file updated with credentials

### **Testing Checklist:**
- [ ] App starts with `npm start`
- [ ] Login page appears
- [ ] "Continue with Google" button works
- [ ] Browser opens for login
- [ ] Can login with Google
- [ ] Redirects back to app
- [ ] Upload page appears after login
- [ ] Logout works
- [ ] Can login again

### **Production Build Checklist:**
- [ ] Build completes (`npm run package`)
- [ ] App file created in `release/build/`
- [ ] Can open app by double-clicking
- [ ] Google login works in production
- [ ] No blank screen
- [ ] All features work

---

## 🔧 Keyboard Shortcuts

### **In the App:**
- `Cmd + Option + I` - Open DevTools
- `Cmd + R` - Reload app
- `Cmd + Q` - Quit app
- `Cmd + W` - Close window

### **In DevTools:**
- `Cmd + K` - Clear console
- `Cmd + F` - Find in console
- `Cmd + Shift + C` - Inspect element

---

## 🚀 Next Steps

After getting the app running:

1. **Explore the Code**
   - Read through `src/renderer/pages/`
   - Understand component structure
   - See how routing works

2. **Make Small Changes**
   - Change button text
   - Modify colors
   - Add console.log statements

3. **Add Features**
   - Add a new page
   - Create a new component
   - Implement new functionality

4. **Learn Best Practices**
   - Read React documentation
   - Study TypeScript
   - Understand Electron architecture

---

## 📞 Getting Help

### **If You're Stuck:**

1. **Check this README**
   - Look in "Common Problems" section
   - Review setup steps

2. **Check DevTools**
   - Press `Cmd + Option + I`
   - Look at Console tab
   - Check for red errors

3. **Check Terminal**
   - Look for error messages
   - Read the full error output

4. **Google the Error**
   - Copy exact error message
   - Search on Google
   - Check Stack Overflow

5. **Ask for Help**
   - Share error messages
   - Explain what you tried
   - Be specific about the problem

---

## 📊 Quick Reference

### **Essential Commands:**
```bash
npm start              # Run development
npm run package        # Build production
npm install           # Install dependencies
npm run lint          # Check code quality
```

### **Important Files:**
```
.env                  # Secret configuration
package.json          # App information
src/main/main.ts      # Main process
src/renderer/App.tsx  # UI entry point
```

### **Important URLs:**
```
Google Cloud Console: https://console.cloud.google.com/
Supabase Dashboard:   https://app.supabase.com/
Node.js Download:     https://nodejs.org/
```

### **Key Concepts:**
- **OAuth** - Login with Google
- **Supabase** - Database and auth service
- **Electron** - Desktop app framework
- **React** - UI framework
- **IPC** - Communication between processes

---

## 🎉 You're Ready!

You now know:
- ✅ What Tallie is and what it does
- ✅ How to install all required software
- ✅ How to set up Google OAuth
- ✅ How to run the app in development
- ✅ How to build production version
- ✅ How to fix common problems
- ✅ How the code is structured
- ✅ Where to find help

**Happy Coding! 🚀**

---

## 📄 License

MIT License - see LICENSE file for details

---

## 🙏 Acknowledgments

Built with:
- [Electron React Boilerplate](https://electron-react-boilerplate.js.org/)
- [Supabase](https://supabase.com/)
- [React](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/)

---

**Last Updated:** October 23, 2025  
**Version:** 4.6.0  
**Maintainer:** Development Team

---

<div align="center">

**Made with ❤️ for students and developers**

</div>
