# Tallie - AI-Powered Tally Prime Desktop Application

<div align="center">

![Tallie Logo](./assets/icon.png)

**Your Tally Prime with AI-powered assistance.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Electron](https://img.shields.io/badge/Electron-35.0.2-47848F?logo=electron)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/React-19.0.0-61DAFB?logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8.2-3178C6?logo=typescript)](https://www.typescriptlang.org/)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Prerequisites](#-prerequisites)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Development](#-development)
- [Building](#-building)
- [Project Structure](#-project-structure)
- [Available Scripts](#-available-scripts)
- [Testing](#-testing)
- [Troubleshooting](#-troubleshooting)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🎯 Overview

**Tallie** is a modern desktop application built with Electron, React, and TypeScript. It provides an AI-powered interface for managing professional connections, uploading documents, and interacting with a FastAPI backend service.

The application features:

- 🔐 Secure authentication system
- 📤 File upload and processing capabilities
- 👤 User profile management
- 🔗 LinkedIn connection integration
- 🎨 Modern, responsive UI with TailwindCSS

---

## ✨ Features

### Core Features

- **User Authentication**: Secure login system integrated with FastAPI backend
- **Profile Management**: View and manage user profiles with connection statistics
- **Document Upload**: Upload and process CSV files (LinkedIn connections)
- **File Processing**: Automated file validation and backend processing
- **Cross-Platform**: Runs on macOS, Windows, and Linux

### Technical Features

- Hot Module Replacement (HMR) for fast development
- TypeScript for type safety
- Modern React with hooks
- Electron IPC for secure main-renderer communication
- Supabase integration for file storage
- Axios for API communication with automatic token refresh

---

## 🛠 Tech Stack

### Frontend

- **Electron** 35.0.2 - Desktop application framework
- **React** 19.0.0 - UI library
- **TypeScript** 5.8.2 - Type-safe JavaScript
- **TailwindCSS** 4.1.14 - Utility-first CSS framework
- **React Router** 7.3.0 - Client-side routing
- **Lucide React** - Modern icon library
- **React Hot Toast** - Toast notifications

### Build Tools

- **Webpack** 5.98.0 - Module bundler
- **Electron Builder** - Application packager
- **ts-node** - TypeScript execution
- **ESLint** - Code linting
- **Prettier** - Code formatting

### Backend Integration

- **Axios** - HTTP client
- **Supabase** - File storage and database

### Testing

- **Jest** 29.7.0 - Testing framework
- **React Testing Library** - Component testing

---

## 📦 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** >= 14.x (Recommended: 18.x or 20.x)
- **npm** >= 7.x (or **yarn** >= 1.22.x)
- **Git** (for cloning the repository)

### System Requirements

- **macOS**: 10.13 or later
- **Windows**: Windows 7 or later
- **Linux**: Ubuntu 18.04 or later (or equivalent)

---

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/Tallie.git
cd Tallie/electron_Tallie
```

### 2. Install Dependencies

```bash
npm install
```

This will:

- Install all required npm packages
- Run post-install scripts
- Build development DLL files
- Install Electron app dependencies

### 3. Configure Environment Variables

Create a `.env` file in the `electron_Tallie` directory:

```bash
cp .env.example .env
```

Edit the `.env` file with your credentials:

```env
# Supabase Configuration
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
```

> **⚠️ Important**: Never commit the `.env` file to version control. It's already included in `.gitignore`.

---

## ⚙️ Configuration

### Supabase Setup

The application requires Supabase for file storage. Follow these steps:

#### 1. Create Supabase Project

- Go to [supabase.com](https://supabase.com)
- Create a new project
- Note your project URL and anon key

#### 2. Set Up Storage Bucket

Create a storage bucket named `connection-files`:

```sql
-- In Supabase SQL Editor
INSERT INTO storage.buckets (id, name, public)
VALUES ('connection-files', 'connection-files', false);
```

Set bucket permissions:

```sql
-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'connection-files');
```

#### 3. Create Database Table

```sql
CREATE TABLE connection_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Backend API Configuration

The app expects a FastAPI backend running at `http://localhost:8000` (configurable in `src/lib/api/axiosInstance.ts`).

Required endpoints:

- `POST /auth/login` - User authentication
- `GET /users/profile` - Fetch user profile
- `POST /connections/process` - Process uploaded files

See the [fastapi_backend](../fastapi_backend) directory for backend setup.

---

## 💻 Development

### Start Development Server

```bash
npm start
```

This will:

1. Start the Webpack dev server (renderer process)
2. Compile the main process
3. Launch the Electron application with hot reload

The app will automatically reload when you make changes to:

- Renderer process files (React components)
- Main process files (Electron main)

### Development Workflow

1. **Make changes** to your code
2. **Save the file** - HMR will update the renderer automatically
3. **For main process changes** - The app will restart automatically

### Debug Mode

The application runs with Electron DevTools enabled in development mode. Press `Cmd+Option+I` (macOS) or `Ctrl+Shift+I` (Windows/Linux) to open DevTools.

---

## 🏗 Building

### Build for Development

```bash
npm run build
```

This creates optimized builds for both main and renderer processes in the `dist` directory.

### Package for Distribution

#### All Platforms (Current OS)

```bash
npm run package
```

#### Windows (x64)

```bash
npm run package:win
```

#### macOS (Universal)

```bash
npm run package
```

The packaged application will be in `release/build/`.

### Build Configuration

Edit `package.json` under the `build` section to customize:

- App name and ID
- Icons and assets
- Target platforms
- Code signing
- Auto-update settings

---

## 📁 Project Structure

```
electron_Tallie/
├── .erb/                      # Electron React Boilerplate configs
│   ├── configs/              # Webpack configurations
│   ├── scripts/              # Build and utility scripts
│   └── mocks/                # Test mocks
├── assets/                    # Application assets
│   ├── icons/                # App icons for different platforms
│   └── entitlements.mac.plist
├── src/
│   ├── main/                 # Electron main process
│   │   ├── main.ts          # Main entry point
│   │   ├── menu.ts          # Application menu
│   │   └── preload.ts       # Preload script
│   ├── renderer/             # React application
│   │   ├── pages/           # Page components
│   │   │   ├── Login/       # Login page
│   │   │   ├── Profile/     # Profile page
│   │   │   └── Upload/      # Upload page
│   │   ├── App.tsx          # Main App component
│   │   └── index.tsx        # Renderer entry point
│   ├── lib/                  # Shared libraries
│   │   ├── api/             # API client and axios config
│   │   └── supabase/        # Supabase client
│   ├── types/                # TypeScript type definitions
│   ├── utils/                # Utility functions
│   └── config/               # Configuration files
├── release/                   # Build output
│   ├── app/                 # Packaged app
│   └── build/               # Installers
├── .env.example              # Environment variables template
├── package.json              # Dependencies and scripts
├── tsconfig.json             # TypeScript configuration
└── README.md                 # This file
```

### Key Directories

- **`src/main/`**: Electron main process (Node.js environment)
- **`src/renderer/`**: React application (browser environment)
- **`src/lib/`**: Shared code between main and renderer
- **`.erb/`**: Build configuration and scripts

---

## 📜 Available Scripts

### Development

```bash
npm start              # Start development server
npm run start:main     # Start only main process
npm run start:renderer # Start only renderer process
```

### Building

```bash
npm run build          # Build for production
npm run build:main     # Build main process only
npm run build:renderer # Build renderer process only
npm run build:dll      # Build development DLL
```

### Packaging

```bash
npm run package        # Package for current platform
npm run package:win    # Package for Windows
```

### Code Quality

```bash
npm run lint           # Run ESLint
npm run lint:fix       # Fix ESLint errors
npm test               # Run tests
```

### Utilities

```bash
npm run postinstall    # Run after npm install
npm run rebuild        # Rebuild native modules
```

---

## 🧪 Testing

### Run Tests

```bash
npm test
```

### Run Tests in Watch Mode

```bash
npm test -- --watch
```

### Test Coverage

```bash
npm test -- --coverage
```

### Writing Tests

Tests are located in `src/__tests__/` and use Jest with React Testing Library.

Example test:

```typescript
import { render, screen } from '@testing-library/react';
import App from '../renderer/App';

describe('App', () => {
  it('should render', () => {
    render(<App />);
    expect(screen.getByText('Tallie')).toBeInTheDocument();
  });
});
```

---

## 🔧 Troubleshooting

### Common Issues

#### 1. **Port Already in Use**

```bash
Error: Port 1212 is already in use
```

**Solution**: Kill the process using port 1212 or change the port in `.erb/configs/webpack.config.renderer.dev.ts`

#### 2. **Native Module Errors**

```bash
Error: Module did not self-register
```

**Solution**: Rebuild native modules

```bash
npm run rebuild
```

#### 3. **Supabase Connection Errors**

```bash
Error: Invalid Supabase URL
```

**Solution**: Check your `.env` file and ensure credentials are correct

#### 4. **Build Errors After npm install**

```bash
npm run build:dll
```

#### 5. **TypeScript Errors**

```bash
npm run lint:fix
```

### Debug Logs

Enable verbose logging:

```bash
DEBUG=* npm start
```

Check Electron logs:

- **macOS**: `~/Library/Logs/Tallie/`
- **Windows**: `%USERPROFILE%\AppData\Roaming\Tallie\logs\`
- **Linux**: `~/.config/Tallie/logs/`

---

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Commit your changes**
   ```bash
   git commit -m 'Add amazing feature'
   ```
4. **Push to the branch**
   ```bash
   git push origin feature/amazing-feature
   ```
5. **Open a Pull Request**

### Code Style

- Follow the existing code style
- Run `npm run lint:fix` before committing
- Write tests for new features
- Update documentation as needed

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 📞 Support

- **Email**: support@tallie.app
- **Issues**: [GitHub Issues](https://github.com/yourusername/Tallie/issues)
- **Documentation**: [Wiki](https://github.com/yourusername/Tallie/wiki)

---

## 🙏 Acknowledgments

- Built with [Electron React Boilerplate](https://electron-react-boilerplate.js.org/)
- Icons by [Lucide](https://lucide.dev/)
- UI components styled with [TailwindCSS](https://tailwindcss.com/)

---

<div align="center">

Made with ❤️ by the Tallie Team

</div>
