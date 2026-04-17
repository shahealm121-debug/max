# Login System with Drive

A secure login/signup system with file storage functionality built with Node.js, Express, and SQLite.

## Features

- ✅ User registration (signup)
- ✅ User login with password hashing
- ✅ Session management
- ✅ Password validation
- ✅ Protected routes
- ✅ User dashboard
- ✅ **File upload & download** (Drive)
- ✅ **File management** (delete, list)
- ✅ Responsive UI with tabbed interface

## Prerequisites

- Node.js (v14 or higher)
- npm

## Installation

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
npm start
```

Or for development with auto-reload:
```bash
npm run dev
```

3. Open your browser and navigate to:
```
http://localhost:3000
```

## Project Structure

```
.
├── server.js              # Express server and API routes
├── database.js            # SQLite database initialization
├── package.json           # Project dependencies
├── .env                   # Environment variables
├── uploads/               # User file storage (auto-created)
└── public/
    ├── index.html         # Main HTML page
    ├── styles.css         # Styling
    └── script.js          # Frontend JavaScript
```

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
- Change the session secret in `server.js` (`your-secret-key-change-in-production`)
- Use environment variables for sensitive data
- Enable HTTPS and set `secure: true` in session cookie
- Add input validation and rate limiting
- Use a more robust password policy
- Consider adding email verification
- Implement password reset functionality
- Add file type validation and scanning
- Implement storage quotas per user
- Add logging and monitoring

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
- **sqlite3** - Database
- **bcryptjs** - Password hashing
- **express-session** - Session management
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

