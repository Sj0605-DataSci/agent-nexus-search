# Supabase Setup for Electron App

## Configuration

You need to set up Supabase credentials for the file upload feature to work.

### Setup Instructions

1. **Create a `.env` file** in the `electron_Tallie` directory (or copy from `.env.example`):

```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
```

2. **Replace with your actual credentials:**
   - Get your Supabase URL from your project settings
   - Get your anon/public key from your project API settings

3. **Restart the app** after updating the `.env` file

**Note:** The `.env` file is gitignored for security. Never commit it to version control.

## Supabase Storage Setup

Make sure your Supabase project has:

1. **Storage Bucket**: `connection-files`
   - Create this bucket in your Supabase dashboard
   - Set appropriate permissions (authenticated users can upload)

2. **Database Table**: `connection_files`
   - Should have columns:
     - `id` (uuid, primary key)
     - `user_id` (uuid, foreign key to auth.users)
     - `file_url` (text)
     - `file_name` (text)
     - `status` (text, default: 'pending')
     - `created_at` (timestamp)

## Backend API Endpoint

The app expects a backend endpoint at:
- `POST /connections/process`
- Body: `{ file_id: string }`

This endpoint should:
1. Receive the file ID
2. Download the file from Supabase Storage
3. Process the connections.csv file
4. Update the user's connection status

## How It Works

1. User selects `connections.csv` file
2. File is validated (must be named exactly "connections.csv")
3. 3-second countdown starts
4. File is uploaded to Supabase Storage
5. Database record is created
6. Backend processing is triggered
7. User is redirected to profile page

## File Requirements

- **File name**: Must be exactly `connections.csv` (case-insensitive)
- **File type**: CSV only
- **Source**: LinkedIn data export
- **No ZIP files**: User must extract the CSV first
