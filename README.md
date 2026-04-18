# Login System with Drive

A secure login/signup system with cloud file storage functionality built with Node.js, Express, MongoDB, and Cloudinary.

## Features

- ✅ User registration (signup)
- ✅ User login with password hashing
- ✅ Session management
- ✅ Password validation
- ✅ Protected routes
- ✅ User dashboard
- ✅ **File upload & download** (Cloudinary cloud storage)
- ✅ **File management** (delete, list)
- ✅ **Persistent cloud database** (MongoDB Atlas)
- ✅ **Metadata persistence** - survives server restarts
- ✅ Responsive UI with tabbed interface
- ✅ Admin approval system

## Prerequisites

- Node.js (v14 or higher)
- npm
- MongoDB Atlas account (free tier: [mongodb.com/cloud/atlas](https://mongodb.com/cloud/atlas))
- Cloudinary account (free tier: [cloudinary.com](https://cloudinary.com))

## Installation

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables

Create `.env` file in project root:

```env
# MongoDB - Persistent cloud database
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/dms?retryWrites=true&w=majority

# Cloudinary - Cloud file storage
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Server
PORT=3000
SESSION_SECRET=your-session-secret-change-in-production
NODE_ENV=development
```

### 3. Start the Server

```bash
npm start
```

Or for development with auto-reload:
```bash
npm run dev
```

### 4. Open in Browser

```
http://localhost:3000
```

## Setup Guides

- **[MongoDB Setup](./MONGODB_SETUP.md)** - Configure persistent cloud database
- **[Cloudinary Setup](./CLOUDINARY_SETUP.md)** - Configure cloud file storage

## Project Structure

```
.
├── server.js              # Express server and API routes
├── database.js            # MongoDB connection and models
├── models/
│   ├── User.js            # MongoDB User schema
│   └── File.js            # MongoDB File schema
├── package.json           # Project dependencies
├── .env                   # Environment variables (MONGODB_URI, CLOUDINARY_*)
└── public/
    ├── index.html         # Main HTML page
    ├── styles.css         # Styling
    └── script.js          # Frontend JavaScript
```

## Database (MongoDB Collections)

### Users Collection
- `_id` - User ID (ObjectId)
- `username` - Username (unique)
- `email` - Email address (unique)
- `password` - Hashed password (bcrypt)
- `role` - 'user' or 'admin'
- `status` - 'pending', 'approved', or 'rejected'
- `approved_by` - Admin user ID who approved them
- `approved_at` - Approval timestamp
- `created_at` - Account creation timestamp

### Files Collection
- `_id` - File ID (ObjectId)
- `user_id` - Owner's user ID (ObjectId reference)
- `filename` - Cloudinary public ID
- `original_filename` - Original uploaded filename
- `file_size` - File size in bytes
- `file_type` - MIME type
- `cloudinary_url` - Persistent Cloudinary URL ⭐
- `cloudinary_id` - Cloudinary public ID
- `department` - Document department
- `category` - Document category
- `uploaded_at` - Upload timestamp

**The key improvement:** Both `cloudinary_url` and `cloudinary_id` are now **permanently stored in MongoDB**, so they survive server restarts!

## API Endpoints

### Authentication

- **POST** `/api/auth/signup` - Create a new user account
  - Body: `{ username, email, password, confirmPassword }`

- **POST** `/api/auth/login` - Login with existing credentials
  - Body: `{ username, password }`

- **GET** `/api/auth/me` - Get current user info (protected)

- **POST** `/api/auth/logout` - Logout current user

### File Management (Drive)

- **POST** `/api/files/upload` - Upload a file (multipart/form-data)
  - Field: `file` (max 50MB)

- **GET** `/api/files` - List all user files (protected)

- **GET** `/api/files/:fileId/download` - Download a file (protected)

- **DELETE** `/api/files/:fileId` - Delete a file (protected)

## Database

### Users Table
- `id` - User ID (primary key)
- `username` - Username (unique)
- `email` - Email address (unique)
- `password` - Hashed password (bcrypt)
- `created_at` - Account creation timestamp

### Files Table
- `id` - File ID (primary key)
- `user_id` - Owner's user ID (foreign key)
- `filename` - Stored filename
- `original_filename` - Original uploaded filename
- `file_size` - File size in bytes
- `file_type` - MIME type
- `uploaded_at` - Upload timestamp

## Security Notes

⚠️ **Important for Production:**
- Set MongoDB connection string via environment variables (never hardcode)
- Secure Cloudinary credentials in `.env` (never commit to git)
- Change the session secret to a random string (use `SESSION_SECRET` env var)
- Enable HTTPS and set `secure: true` in session cookie
- Add IP whitelisting to MongoDB Atlas Network Access
- Enable MFA on MongoDB Atlas and Cloudinary accounts
- Add input validation and rate limiting
- Use a more robust password policy
- Consider adding email verification
- Implement password reset functionality
- Add file type validation and scanning
- Implement storage quotas per user
- Add logging and monitoring
- Add `.env` to `.gitignore` (never commit secrets!)

## Best Practices

✅ Always use MongoDB Atlas security features:
- Enable password authentication
- Use strong passwords
- Whitelist IP addresses
- Enable backup features
- Monitor cluster activity

✅ Cloudinary security:
- Store API secrets in environment variables
- Use upload presets for public uploads
- Implement resource-level access controls
- Enable signing for URLs

## Usage

### Create an Account
1. Click "Sign Up"
2. Enter username, email, password, and confirm password
3. Click "Sign Up"

### Login
1. Click "Login" 
2. Enter your username and password
3. Click "Login"

### Upload Files
1. Click the "Drive" tab
2. Click "Choose file" or drag & drop
3. Click "Upload File"
4. File appears in your file list

### Download Files
1. In the Drive tab, find the file
2. Click "Download" to save it to your computer

### Delete Files
1. In the Drive tab, find the file
2. Click "Delete" and confirm

### Logout
1. On the dashboard, click the "Logout" button

## Dependencies

- **express** - Web framework
- **mongoose** - MongoDB ODM (Object Document Mapper)
- **bcryptjs** - Password hashing
- **express-session** - Session management
- **cloudinary** - Cloud file storage
- **multer-storage-cloudinary** - Multer storage adapter for Cloudinary
- **cors** - CORS support
- **multer** - File upload handling
- **dotenv** - Environment variables

## File Storage

User files are stored in the `uploads/` directory organized by user:
```
uploads/
├── user_1/
│   ├── 1234567890_document.pdf
│   └── 1234567891_image.jpg
├── user_2/
│   └── 1234567892_spreadsheet.xlsx
```

Files are stored with timestamped names to prevent collisions while keeping originals accessible.

## License

MIT

