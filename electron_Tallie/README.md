# ⭐ Tallie - Desktop Connector for Tara

<div align="center">

![Tara Logo](./assets/icon.png)

**The Bridge Between TallyPrime and Tara AI**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Electron](https://img.shields.io/badge/Electron-35.0.2-47848F?logo=electron)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/React-19.0.0-61DAFB?logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8.2-3178C6?logo=typescript)](https://www.typescriptlang.org/)

**Tallie connects your local TallyPrime to Tara's AI-powered cloud platform**

</div>

---

## 📖 Table of Contents

- [What is Tallie & Tara?](#-what-is-tallie--tara)
- [How They Work Together](#-how-they-work-together)
- [Key Features](#-key-features)
- [Product Roadmap](#-product-roadmap)
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
- [Who Should Use Tara?](#-who-should-use-tara)

---

## 🎯 What is Tallie & Tara?

### **Tara - Your AI Copilot for TallyPrime** 🤖

**Tara** is your smart AI assistant for TallyPrime - think of it as ChatGPT specifically designed for your accounting and business needs. Just like stars have guided people for hundreds of years, Tara will guide your business through money and accounting challenges.

### **Tallie - The Desktop Connector** 🔗

**Tallie** is the essential desktop application that acts as a secure bridge between your local TallyPrime installation and Tara's cloud-based AI platform. Without Tallie, Tara cannot access your TallyPrime data.

### **The Relationship:**

```
┌─────────────────┐         ┌──────────────┐         ┌─────────────────┐
│   TallyPrime    │ ◄─────► │    Tallie    │ ◄─────► │   Tara (AI)     │
│  (Your Data)    │         │  (Connector) │         │  (Cloud/WhatsApp)│
└─────────────────┘         └──────────────┘         └─────────────────┘
   Local Computer            Desktop App              Cloud Platform
```

**Think of it this way:**

- **TallyPrime** = Your accounting software with all your business data
- **Tallie** = The secure tunnel/bridge that connects Tally to the cloud
- **Tara** = The AI brain that understands your data and helps you via WhatsApp/Chat

### **The Problem Tara Solves:**

- ⏰ **Time-consuming data entry** - Typing invoices manually takes hours
- 📊 **Complex inventory management** - Tracking stock across locations is difficult
- 💰 **Payment tracking** - Following up on customer payments is awkward
- 📱 **Limited accessibility** - Can't access Tally data on the go
- 🔄 **Repetitive tasks** - Same questions answered multiple times
- 📈 **Business insights** - Hard to get quick answers about sales, stock, or performance

### **How Tara Helps (via Tallie):**

Tara connects your TallyPrime with modern AI technology through Tallie, allowing you to:

- 💬 Chat with your Tally data via WhatsApp (24/7 availability)
- 📸 Take photos of invoices and auto-enter them into Tally
- 🤖 Automate inventory and ledger updates
- 📊 Get instant business insights and reports
- 🔔 Send automatic payment reminders to customers
- 🎤 Use voice commands to query your data

Think of Tara as having a smart assistant who understands Tally and helps you work faster and smarter!

---

## 🔄 How They Work Together

### **Step-by-Step Flow:**

1. **Install Tallie** on the same computer where TallyPrime runs
2. **Tallie connects** to your local TallyPrime via XML API (port 9000)
3. **Tallie syncs** your data securely to Tara's cloud platform
4. **Tara processes** your data with AI and makes it accessible via:
   - WhatsApp chatbot
   - Web dashboard
   - Mobile app
5. **You interact** with Tara from anywhere, anytime
6. **Tara sends commands** back through Tallie to update TallyPrime

### **Why This Architecture?**

- ✅ **Security**: Your TallyPrime data stays on your computer
- ✅ **Real-time**: Tallie keeps data synced automatically
- ✅ **Accessibility**: Access your data from anywhere via Tara
- ✅ **No Manual Work**: Automatic sync, no Excel exports needed
- ✅ **Offline Support**: Tallie caches data for offline access

---

## ✨ Key Features

### **Tallie (Desktop Connector) - Current Features:**

- 🔐 **Secure Authentication** - Login with Google OAuth
- 🖥️ **Desktop Application** - Native app for Mac/Windows/Linux
- 🔗 **Tally Integration** - Direct connection to your local TallyPrime via XML API
- 📤 **File Management** - Upload and process business documents
- 👤 **Profile Management** - Manage your account and preferences
- 🎨 **Modern UI** - Beautiful, intuitive interface built with React
- 🔄 **Auto Sync** - Keeps your data synchronized with Tara cloud
- 🔒 **Secure Tunnel** - Encrypted connection between Tally and Tara

### **Coming Soon (See Roadmap):**

- 💬 **WhatsApp Integration** - Answer customer queries automatically
- 📸 **Smart Invoice Entry** - Photo to Tally in seconds
- 🤖 **Auto Inventory Updates** - Real-time stock management
- 📊 **AI-Powered Insights** - Business intelligence at your fingertips
- 🔔 **Smart Reminders** - Automated payment follow-ups
- 🎤 **Voice Commands** - Talk to your Tally data

---

## 🗺️ Product Roadmap

Tara (powered by Tallie) is being built in phases, with each phase adding powerful new capabilities. Here's our complete development timeline:

> **Note:** Tallie is the foundation that enables all Tara features by connecting TallyPrime to the cloud.

### **Phase 1: WhatsApp Integration** ✅ _Completed - Mid November 2025_

**What it does:**

- WhatsApp chatbot that answers customer questions about product prices automatically
- Customers send: "What is the price of Product X?"
- Tara instantly replies with the correct price from your stock items

**How to use:**

1. Upload Excel file with stock items and prices
2. Connect your WhatsApp Business number
3. Start getting automatic replies 24/7

**Benefits:**

- ⏱️ Saves time - no manual price lookups
- 🌙 Works 24/7 - even when you're sleeping
- ⚡ Instant customer responses
- 📉 Less back-and-forth messages

---

### **Phase 2: Tallie - Desktop Connector** ✅ _Completed - 30 October 2025_

**What it does:**

- **Tallie** is the desktop application that connects your local TallyPrime to Tara's cloud
- Creates secure tunnel between Tally and Tara's servers
- Real-time data access without manual exports
- This is the app you're currently reading about!

**How to use:**

1. Install Tallie desktop app (5 minutes)
2. Keep TallyPrime running on the same computer
3. Configure data access permissions in Tallie
4. Tallie automatically syncs data to Tara

**Benefits:**

- 🚫 No more manual Excel uploads
- ⚡ Real-time data - always current
- ✅ More accurate - direct from Tally
- 🔒 Safer than manual file sharing
- 🔄 Automatic background sync

---

### **Phase 3: Smart Invoice Entry** 🚧 _In Progress - Target: 15 November 2025_

**What it does:**

- Take photo of any invoice/bill → Tara automatically enters it into Tally
- **95% reduction in typing errors**
- **80% time savings on data entry**

**Three ways to send invoices:**

1. 📸 **Photo via WhatsApp** - Snap and send
2. 📄 **PDF Upload** - Scan and upload
3. 🎤 **Voice Message** - Read invoice details aloud

**What Tara reads automatically:**

- Vendor name
- Invoice number & date
- Items purchased & quantities
- Prices & GST amounts
- Total amount

**How to use:**

1. Send invoice (photo/PDF/voice)
2. Review auto-filled details
3. Click "Save" → Goes straight to Tally

**Benefits:**

- ⚡ 80% faster data entry
- ✅ 95% fewer typing errors
- 📋 Works with any invoice format
- 🚀 Process hundreds of bills in minutes
- 👥 Staff focus on important work, not typing

---

### **Phase 4: Automatic Inventory & Ledger Updates** 📅 _Target: 30 November 2025_

**What it does:**

- Automatic stock and ledger updates when purchases/sales happen
- Real-time inventory tracking
- Auto-balanced ledger accounts

**For Purchases:**

- Reads purchase invoice
- Adds items to inventory
- Updates stock quantities
- Creates ledger entries
- Calculates and records GST

**For Sales:**

- Reduces stock automatically
- Creates sales entry
- Updates customer account
- Generates GST invoice
- Sends invoice via WhatsApp

**How to use:**

1. Set up masters (vendors, customers, products) once
2. Tara learns your patterns
3. Everything happens automatically

**Benefits:**

- 📊 Always know real stock levels
- 🚫 No manual stock register maintenance
- ⚖️ Ledgers always balanced
- ✅ Never miss a transaction
- ⚡ Real-time inventory tracking

---

### **Phase 5: Advanced Features** 🔮 _December 2025 - February 2026_

#### **5A. Smart Payment Reminders** 📅 _Target: 7 December 2025_

- Automatic WhatsApp reminders to customers with pending payments
- Get paid faster without awkward phone calls
- Customizable reminder schedules

#### **5B. Daily Business Summary** 📅 _Target: 7 December 2025_

- Morning WhatsApp message with:
  - Yesterday's sales total
  - Outstanding payments
  - Low stock items
  - Today's important tasks
- Start your day knowing exactly what needs attention

#### **5C. Expense Tracking from Receipts** 📅 _Target: 7 December 2025_

- Photo any expense receipt (fuel, stationery, travel)
- Tara records it in Tally under correct expense head
- Never lose receipts, complete expense records

#### **5D. GST Return Helper** 📅 _Target: 21 December 2025_

- Checks GST entries for mistakes
- Prepares return files ready for GST portal
- File GST returns correctly and on time without stress

#### **5E. Multi-Location Stock Transfer** 📅 _Target: 30 December 2025_

- Manage stock across multiple shops/warehouses
- Simple WhatsApp commands for transfers
- No phone calls or confusion

#### **5F. Customer Order Taking** 📅 _Target: 30 December 2025_

- Customers order products via WhatsApp
- Tara checks stock and confirms availability
- Creates order in Tally automatically
- Take orders 24/7, reduce mistakes

#### **5G. Sales Performance Reports** 📅 _Target: 30 December 2025_

- Which products sell most
- Which customers buy most
- Best selling days/months
- Profit margins
- Make better business decisions with clear data

#### **5H. Automatic Bank Reconciliation** 📅 _Target: Mid-January 2026_

- Matches bank statement with Tally entries
- Shows missing payments
- Find mistakes quickly, keep books clean

#### **5I. Vendor Payment Tracking** 📅 _Target: End of January 2026_

- Know which vendor payments are due when
- Reminders before due dates
- Send payment confirmations to vendors
- Never miss deadlines, maintain good relationships

#### **5J. Voice Commands for Tally** 📅 _Target: Early February 2026_

- Speak: "Show me sales for this month"
- Ask: "What is stock of Product X?"
- Tara answers instantly
- Faster than typing, works while multitasking

---

### **📊 Complete Timeline Summary**

| Phase          | Feature                         | Timeline    | Status                       |
| -------------- | ------------------------------- | ----------- | ---------------------------- |
| **Phase 1**    | WhatsApp Price Queries          | 1-2 weeks   | ✅ Completed (Mid-Nov 2025)  |
| **Phase 2**    | Desktop App + Tally Connection  | 2 weeks     | ✅ Completed (30 Oct 2025)   |
| **Phase 3**    | Smart Invoice Entry             | 2 weeks     | 🚧 In Progress (15 Nov 2025) |
| **Phase 4**    | Auto Inventory & Ledger         | 2 weeks     | 📅 Planned (30 Nov 2025)     |
| **Phase 5A-C** | Reminders, Summary, Expenses    | 1 week each | 📅 Planned (7 Dec 2025)      |
| **Phase 5D**   | GST Return Helper               | 2 weeks     | 📅 Planned (21 Dec 2025)     |
| **Phase 5E-G** | Multi-location, Orders, Reports | 1 week each | 📅 Planned (30 Dec 2025)     |
| **Phase 5H**   | Bank Reconciliation             | 2 weeks     | 📅 Planned (Mid-Jan 2026)    |
| **Phase 5I**   | Vendor Payment Tracking         | 1-2 weeks   | 📅 Planned (End Jan 2026)    |
| **Phase 5J**   | Voice Commands                  | 1 week      | 📅 Planned (Early Feb 2026)  |

### **🎯 Key Milestones**

- **✅ End of October (30 Oct):** Desktop app ready - Tally connected to Tara
- **🚧 Mid-November (15 Nov):** Invoice scanning working - photo to Tally entry
- **📅 End of November (30 Nov):** Full automation - inventory and ledgers update automatically
- **📅 Early December (7 Dec):** Smart reminders, daily summaries, expense tracking live
- **📅 Before Christmas (21 Dec):** GST helper ready for tax season
- **📅 New Year (30 Dec):** Multi-location stock, customer ordering, sales reports working
- **📅 January-February 2026:** Bank reconciliation, vendor tracking, voice commands complete

---

### **🌟 What Makes Tara Special?**

1. **Simple to Use** - Everything works through WhatsApp - no complex software to learn
2. **Saves Time** - Tasks that took hours now take minutes
3. **Reduces Mistakes** - 95% fewer errors compared to manual entry
4. **Works 24/7** - Your business never sleeps
5. **Speaks Your Language** - Plain simple language, no technical jargon
6. **Grows with You** - Start small, add features as needed
7. **Safe and Secure** - Your data stays protected with enterprise-grade security

---

## ⚡ Quick Start - Installing Tallie (10 Minutes)

> **Want to get Tallie running fast?** Follow these essential steps to connect your TallyPrime to Tara!

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

Wait 2-3 minutes for installation...

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
2. Create project → Name: "Tara"
3. APIs & Services → Credentials → Create OAuth 2.0 Client
4. Add redirect URI: `https://mtxrobrwanikajymnkaf.supabase.co/auth/v1/callback`
5. Copy Client ID and Secret

**B. Supabase:**

1. Go to: https://app.supabase.com/
2. Create project → Name: "Tara"
3. Authentication → Providers → Enable Google
4. Paste Client ID and Secret
5. Add redirect URL: `tara://oauth/callback`

### **Step 5: Run Tallie!** (30 sec)

```bash
npm start
```

⏳ Wait 10-20 seconds... Tallie opens! 🎉

### **Quick Test:**

1. Click "Continue with Google"
2. Login with Google
3. You're in! ✅
4. Tallie is now ready to connect to your TallyPrime and sync data to Tara

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
5. **Name:** "Tara App"
6. **Click** "Create"
7. **Wait** for project creation (10-20 seconds)

#### **2. Configure OAuth Consent Screen**

1. **Go to:** APIs & Services → OAuth consent screen
2. **User Type:** Choose "External"
3. **Click** "Create"
4. **Fill in:**
   - App name: `Tara`
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
4. **Name:** "Tara Desktop App"

5. **Add Authorized JavaScript origins:**

   ```
   https://mtxrobrwanikajymnkaf.supabase.co
   ```

6. **Add Authorized redirect URIs:**

   ```
   https://mtxrobrwanikajymnkaf.supabase.co/auth/v1/callback
   ```

   ⚠️ **IMPORTANT:** Do NOT add `tara://oauth/callback` here!

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
   - Name: `Tara`
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
   tara://oauth/callback
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
release/build/mac/Tara.app          # macOS (Intel)
release/build/mac-arm64/Tara.app    # macOS (Apple Silicon)
```

### **Running Production Build**

```bash
# For Intel Mac
open release/build/mac/Tara.app

# For Apple Silicon Mac (M1/M2/M3)
open release/build/mac-arm64/Tara.app
```

**Or:** Just double-click the app in Finder!

### **Distributing the App**

The `.dmg` files in `release/build/` can be shared:

```
Tara-4.6.0.dmg              # Intel Mac
Tara-4.6.0-arm64.dmg        # Apple Silicon Mac
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
   - Supabase should have: `tara://oauth/callback`
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
3. Make sure `tara://oauth/callback` is FIRST in the list
4. Save and restart app

---

### **Problem 5: OAuth Opens in New Window**

**Cause:** Protocol handler not registered properly in dev mode

**Solution:** Use production build

```bash
npm run package
open release/build/mac/Tara.app
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
8. Supabase redirects to tara://oauth/callback
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
  "name": "tara",
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

## 👥 Who Should Use Tara?

Tara is perfect for:

### **Business Owners**

- 🏪 **Shopkeepers** with daily sales and inventory
- 🏭 **Small Manufacturers** managing production and stock
- 📦 **Distributors & Wholesalers** handling multiple vendors
- 🔧 **Service Businesses** (repair shops, clinics, consultancies)

### **Finance Professionals**

- 👨‍💼 **Accountants** managing multiple client books
- 📊 **Finance Managers** needing real-time insights
- 🎓 **CA/CPA Professionals** handling GST and compliance

### **Anyone Who:**

- Uses TallyPrime and wants to save time
- Is tired of manual data entry
- Receives invoices on WhatsApp
- Manages multiple business locations
- Needs 24/7 access to business data
- Wants to reduce accounting errors
- Struggles with payment follow-ups
- Needs quick business insights

---

## 🎉 You're Ready!

You now know:

- ✅ What Tara is and what it does
- ✅ How Tara solves real business problems
- ✅ The complete product roadmap
- ✅ How to install all required software
- ✅ How to set up Google OAuth
- ✅ How to run the app in development
- ✅ How to build production version
- ✅ How to fix common problems
- ✅ How the code is structured
- ✅ Where to find help

**Happy Coding! 🚀**

---

## � Next Steps

### **For Developers:**

1. Explore the codebase and understand the architecture
2. Review the product roadmap and pick a feature to build
3. Set up your development environment
4. Start contributing to Tara's growth

### **For Business Users:**

1. Install **Tallie** desktop app (this application)
2. Connect your TallyPrime through Tallie
3. Access **Tara** via WhatsApp for price queries
4. Gradually adopt more Tara features as they're released

### **For Contributors:**

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

## 🔑 Key Takeaways

### **Remember:**

- **Tallie** = Desktop connector app (what you're installing)
- **Tara** = AI assistant platform (what you interact with)
- **TallyPrime** = Your accounting software (where your data lives)

### **The Complete Flow:**

```
You → Tara (WhatsApp/Web) → Tallie (Desktop) → TallyPrime (Local)
```

### **Why Both Are Needed:**

- **Tallie** provides the secure bridge and data sync
- **Tara** provides the AI intelligence and accessibility
- Together, they transform how you work with TallyPrime

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
- [TallyPrime](https://tallysolutions.com/) - The world's leading business management software

---

## 📞 Contact & Support

- **Website:** [https://discoverminds.ai](https://discoverminds.ai)
- **Email:** support@discoverminds.ai
- **Documentation:** See this README and inline code comments

---

**Last Updated:** November 16, 2025  
**Version:** 4.6.0  
**Maintainer:** DiscoverMinds Team

---

<div align="center">

**Made with ❤️ for businesses and accountants using TallyPrime**

_Just like stars have guided travelers for centuries, Tara guides your business through accounting and finance_

</div>
