import express from 'express';
import session from 'express-session';
import bcryptjs from 'bcryptjs';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import dotenv from 'dotenv';
import { connectDB, db } from './database.js';
import mongoose from 'mongoose';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure multer for Cloudinary storage with proper handling for all file types
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: (req, file) => `dms/user_${req.session.userId}`,
    public_id: (req, file) => `${Date.now()}_${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '')}`,
    resource_type: (req, file) => {
      // Determine resource_type based on file type
      // PDF, ZIP, and most documents should use 'raw'
      const ext = path.extname(file.originalname).toLowerCase();
      const rawTypes = ['.pdf', '.zip', '.rar', '.7z', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.csv', '.json'];
      
      if (rawTypes.includes(ext)) {
        return 'raw';
      }
      
      // Images can use auto
      if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'].includes(ext)) {
        return 'auto';
      }
      
      // Default to raw for any unknown type
      return 'raw';
    }
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    // Allow all file types - Cloudinary will handle them
    console.log(`[UPLOAD] File received: ${file.originalname}, MIME: ${file.mimetype}`);
    cb(null, true);
  }
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Prevent caching of authenticated pages
app.use((req, res, next) => {
  // Set no-cache headers for dashboard and protected pages
  if (req.path.includes('dashboard') || req.path.includes('admin')) {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
  }
  next();
});

app.use(express.static(path.join(__dirname, 'public')));

// Trust proxy for Render/production
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  proxy: process.env.NODE_ENV === 'production',
  cookie: { 
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 * 24 * 7 // 7 days
  }
}));

// Initialize server and database
async function initializeServer() {
  try {
    // Connect to MongoDB
    await connectDB();

    app.listen(PORT, () => {
      console.log(`🚀 Server is running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

// Middleware to check if user is authenticated
function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  next();
}

// Error handling middleware for multer
function handleMulterError(err, req, res, next) {
  if (err) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      console.error('[UPLOAD] File too large:', err.message);
      return res.status(400).json({ error: 'File too large. Maximum size is 50MB.' });
    }
    if (err.code === 'LIMIT_PART_COUNT') {
      return res.status(400).json({ error: 'Too many file parts' });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: 'Too many files' });
    }
    // Cloudinary errors
    if (err.message && err.message.includes('Cloudinary')) {
      console.error('[UPLOAD] Cloudinary error:', err.message);
      return res.status(500).json({ error: 'Upload failed. Please try again.' });
    }
    console.error('[UPLOAD] Upload error:', err);
    return res.status(500).json({ error: 'Upload failed: ' + err.message });
  }
  next();
}

// Middleware to check if user is admin
async function requireAdmin(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  try {
    const user = await db.getUserById(req.session.userId);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    next();
  } catch (err) {
    res.status(500).json({ error: 'Authorization error' });
  }
}

// Routes

// Signup
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { username, email, password, confirmPassword } = req.body;

    if (!username || !email || !password || !confirmPassword) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if user already exists
    const existingUser = await db.User.findOne({
      $or: [{ username }, { email }]
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Username or email already exists' });
    }

    // Create new user
    const user = await db.createUser(username, email, password, 'user', 'pending');

    res.json({
      message: 'Signup successful. Waiting for admin approval.',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        status: user.status
      }
    });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Error creating user' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const user = await db.getUserByUsername(username);

    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Check if user is approved
    if (user.status !== 'approved') {
      return res.status(403).json({ error: 'Your account is pending admin approval' });
    }

    // Compare password
    const isValidPassword = user.comparePassword(password);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Set session
    req.session.userId = user._id.toString();
    req.session.username = user.username;
    req.session.userRole = user.role;

    res.json({
      message: 'Login successful',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Error logging in' });
  }
});

// Get current user (protected route)
app.get('/api/auth/me', requireAuth, async (req, res) => {
  try {
    const user = await db.getUserById(req.session.userId);

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    res.json({
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      status: user.status,
      created_at: user.created_at
    });
  } catch (err) {
    console.error('Error fetching user:', err);
    res.status(500).json({ error: 'Error fetching user' });
  }
});

// Get user statistics
app.get('/api/user/stats', requireAuth, async (req, res) => {
  try {
    const stats = await db.getUserStats(req.session.userId);
    res.json(stats);
  } catch (err) {
    console.error('Error fetching user stats:', err);
    res.status(500).json({ error: 'Error fetching stats' });
  }
});

// Logout
app.post('/api/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Error logging out' });
    }
    res.json({ message: 'Logout successful' });
  });
});

// Admin Routes

// Get pending users
app.get('/api/admin/pending-users', requireAdmin, async (req, res) => {
  try {
    const users = await db.getPendingUsers();
    res.json(users || []);
  } catch (err) {
    console.error('Error fetching pending users:', err);
    res.status(500).json({ error: 'Error fetching pending users' });
  }
});

// Approve user
app.post('/api/admin/approve-user/:userId', requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const updated = await db.approveUser(userId, req.session.userId);

    if (!updated) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User approved successfully' });
  } catch (err) {
    console.error('Error approving user:', err);
    res.status(500).json({ error: 'Error approving user' });
  }
});

// Reject user
app.post('/api/admin/reject-user/:userId', requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const updated = await db.rejectUser(userId);

    if (!updated) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User rejected' });
  } catch (err) {
    console.error('Error rejecting user:', err);
    res.status(500).json({ error: 'Error rejecting user' });
  }
});

// Get all users
app.get('/api/admin/users', requireAdmin, async (req, res) => {
  try {
    const users = await db.getAllUsers();
    res.json(users || []);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: 'Error fetching users' });
  }
});

// Get dashboard statistics
app.get('/api/admin/stats', requireAdmin, async (req, res) => {
  try {
    const stats = await db.getAdminStats();
    res.json(stats);
  } catch (err) {
    console.error('Error fetching admin stats:', err);
    res.status(500).json({ error: 'Error fetching stats' });
  }
});

// File Routes

// Upload file to Cloudinary
app.post('/api/files/upload', requireAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { originalname, size, mimetype, filename } = req.file;
    // Use secure_url returned by Cloudinary (do NOT modify this URL)
    const cloudinaryUrl = req.file.secure_url || req.file.path;
    const cloudinaryPublicId = req.file.filename; // Public ID from Cloudinary
    const { department = 'mainoffice', category = 'report' } = req.body;

    // Log detailed info for PDF and ZIP files
    const ext = path.extname(originalname).toLowerCase();
    if (['.pdf', '.zip', '.rar', '.7z'].includes(ext)) {
      console.log(`[UPLOAD] ${ext.toUpperCase()} File: ${originalname}`);
      console.log(`[UPLOAD] Size: ${(size / 1024 / 1024).toFixed(2)}MB, MIME: ${mimetype}`);
      console.log(`[UPLOAD] Cloudinary Public ID: ${cloudinaryPublicId}`);
      console.log(`[UPLOAD] Cloudinary URL: ${cloudinaryUrl}`);
    } else {
      console.log(`[UPLOAD] File: ${originalname}, Public ID: ${cloudinaryPublicId}, URL: ${cloudinaryUrl}`);
    }

    // Check for duplicate in last 5 seconds
    const duplicateFile = await db.checkDuplicate(
      req.session.userId,
      originalname,
      cloudinaryPublicId,
      5
    );

    if (duplicateFile) {
      console.log('[UPLOAD] Duplicate detected, skipping');
      return res.status(400).json({
        error: 'This file was just uploaded. Please wait.',
        isSkipped: true
      });
    }

    // Insert into database
    const file = await db.uploadFile(
      req.session.userId,
      cloudinaryPublicId,
      originalname,
      size,
      mimetype,
      cloudinaryUrl,
      cloudinaryPublicId,
      department,
      category
    );

    console.log(`[UPLOAD] ✅ File saved successfully, ID: ${file._id}`);
    res.json({
      message: 'File uploaded successfully',
      file: {
        id: file._id,
        filename: originalname,
        size,
        department,
        category,
        uploaded_at: new Date().toISOString()
      }
    });
  } catch (err) {
    console.error('[UPLOAD] Error:', err);
    res.status(500).json({ error: 'Upload failed: ' + err.message });
  }
});

// Error handling for upload route
app.use((err, req, res, next) => {
  if (req.path === '/api/files/upload') {
    handleMulterError(err, req, res, next);
  } else {
    next(err);
  }
});

// List user files
app.get('/api/files', requireAuth, async (req, res) => {
  try {
    const { department = 'mainoffice', category = 'report' } = req.query;

    const files = await db.getUserFiles(req.session.userId, department, category);
    res.json(files || []);
  } catch (err) {
    console.error('Error retrieving files:', err);
    res.status(500).json({ error: 'Error retrieving files' });
  }
});

// Download file
// Download file from Cloudinary with fl_attachment to force download (not open in browser)
app.get('/api/files/:fileId/download', requireAuth, async (req, res) => {
  try {
    const { fileId } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(fileId)) {
      return res.status(400).json({ error: 'Invalid file ID' });
    }

    const file = await db.getFileById(fileId, req.session.userId);

    if (!file) {
      console.error('[DOWNLOAD] File not found for user:', req.session.userId);
      return res.status(404).json({ error: 'File not found' });
    }

    if (!file.cloudinary_url) {
      console.error('[DOWNLOAD] Cloudinary URL not available for file:', fileId);
      return res.status(404).json({ error: 'File URL not available' });
    }

    console.log(`[DOWNLOAD] File: ${file.original_filename}`);

    // Use Cloudinary fl_attachment transformation to force download
    let downloadUrl = file.cloudinary_url;

    if (downloadUrl.includes('/upload/')) {
      downloadUrl = downloadUrl.replace('/upload/', '/upload/fl_attachment/');
    }

    console.log(`[DOWNLOAD] Download URL: ${downloadUrl}`);

    // Redirect to Cloudinary URL - forces browser to download instead of open
    res.redirect(downloadUrl);
  } catch (err) {
    console.error('[DOWNLOAD] Error:', err);
    res.status(500).json({ error: 'Download error' });
  }
});

// Delete file from Cloudinary and database
app.delete('/api/files/:fileId', requireAuth, async (req, res) => {
  try {
    const { fileId } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(fileId)) {
      return res.status(400).json({ error: 'Invalid file ID' });
    }

    const file = await db.getFileById(fileId, req.session.userId);

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Delete from Cloudinary
    if (file.cloudinary_id) {
      cloudinary.uploader.destroy(file.cloudinary_id, (error, result) => {
        if (error) {
          console.error('Cloudinary delete error:', error);
        }
      });
    }

    // Delete from database
    await db.deleteFile(fileId, req.session.userId);

    res.json({ message: 'File deleted successfully' });
  } catch (err) {
    console.error('Error deleting file:', err);
    res.status(500).json({ error: 'Error deleting file' });
  }
});

// Serve main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
initializeServer();
