import express from 'express';
import session from 'express-session';
import bcryptjs from 'bcryptjs';
import cors from 'cors';
import multer from 'multer';
import fs from 'fs';
import db from './database.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

// Set up uploads directory
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const userDir = path.join(uploadsDir, `user_${req.session.userId}`);
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }
    cb(null, userDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}_${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// Session middleware
app.use(session({
  secret: 'your-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false, // Set to true if using HTTPS
    maxAge: 1000 * 60 * 60 * 24 // 24 hours
  }
}));

// Middleware to check if user is authenticated
function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  next();
}

// Middleware to check if user is admin
function requireAdmin(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  db.get('SELECT role FROM users WHERE id = ?', [req.session.userId], (err, user) => {
    if (err || !user) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    next();
  });
}

// Routes

// Signup
app.post('/api/auth/signup', (req, res) => {
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

  // Hash password
  const hashedPassword = bcryptjs.hashSync(password, 10);

  // Insert user into database with pending status
  db.run(
    'INSERT INTO users (username, email, password, role, status) VALUES (?, ?, ?, ?, ?)',
    [username, email, hashedPassword, 'user', 'pending'],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(400).json({ error: 'Username or email already exists' });
        }
        return res.status(500).json({ error: 'Error creating user' });
      }

      res.json({ 
        message: 'Signup successful. Waiting for admin approval.', 
        user: { id: this.lastID, username, email, status: 'pending' } 
      });
    }
  );
});

// Login
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  db.get(
    'SELECT * FROM users WHERE username = ?',
    [username],
    (err, user) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (!user) {
        return res.status(401).json({ error: 'Invalid username or password' });
      }

      // Check if user is approved
      if (user.status !== 'approved') {
        return res.status(403).json({ error: 'Your account is pending admin approval' });
      }

      // Compare password
      const isValidPassword = bcryptjs.compareSync(password, user.password);

      if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid username or password' });
      }

      // Set session
      req.session.userId = user.id;
      req.session.username = user.username;
      req.session.userRole = user.role;

      res.json({ 
        message: 'Login successful', 
        user: { id: user.id, username: user.username, email: user.email, role: user.role } 
      });
    }
  );
});

// Get current user (protected route)
app.get('/api/auth/me', requireAuth, (req, res) => {
  db.get(
    'SELECT id, username, email, role, status, created_at FROM users WHERE id = ?',
    [req.session.userId],
    (err, user) => {
      if (err || !user) {
        return res.status(401).json({ error: 'User not found' });
      }
      res.json(user);
    }
  );
});

// Get user statistics
app.get('/api/user/stats', requireAuth, (req, res) => {
  db.serialize(() => {
    db.get('SELECT COUNT(*) as total FROM files WHERE user_id = ?', [req.session.userId], (err, filesCount) => {
      if (err) {
        return res.status(500).json({ error: 'Error fetching stats' });
      }

      db.get('SELECT SUM(file_size) as total FROM files WHERE user_id = ?', [req.session.userId], (err, storageSize) => {
        if (err) {
          return res.status(500).json({ error: 'Error fetching stats' });
        }

        res.json({
          totalFiles: filesCount.total || 0,
          totalStorage: storageSize.total || 0
        });
      });
    });
  });
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
app.get('/api/admin/pending-users', requireAdmin, (req, res) => {
  db.all(
    'SELECT id, username, email, created_at FROM users WHERE status = ? ORDER BY created_at DESC',
    ['pending'],
    (err, users) => {
      if (err) {
        return res.status(500).json({ error: 'Error fetching pending users' });
      }
      res.json(users || []);
    }
  );
});

// Approve user
app.post('/api/admin/approve-user/:userId', requireAdmin, (req, res) => {
  const { userId } = req.params;

  db.run(
    'UPDATE users SET status = ?, approved_by = ?, approved_at = datetime("now") WHERE id = ?',
    ['approved', req.session.userId, userId],
    (err) => {
      if (err) {
        return res.status(500).json({ error: 'Error approving user' });
      }
      res.json({ message: 'User approved successfully' });
    }
  );
});

// Reject user
app.post('/api/admin/reject-user/:userId', requireAdmin, (req, res) => {
  const { userId } = req.params;

  db.run(
    'UPDATE users SET status = ? WHERE id = ?',
    ['rejected', userId],
    (err) => {
      if (err) {
        return res.status(500).json({ error: 'Error rejecting user' });
      }
      res.json({ message: 'User rejected' });
    }
  );
});

// Get all users
app.get('/api/admin/users', requireAdmin, (req, res) => {
  db.all(
    'SELECT id, username, email, role, status, created_at FROM users ORDER BY created_at DESC',
    (err, users) => {
      if (err) {
        return res.status(500).json({ error: 'Error fetching users' });
      }
      res.json(users || []);
    }
  );
});

// Get dashboard statistics
app.get('/api/admin/stats', requireAdmin, (req, res) => {
  db.serialize(() => {
    db.get('SELECT COUNT(*) as total FROM users', (err, usersCount) => {
      if (err) {
        return res.status(500).json({ error: 'Error fetching stats' });
      }

      db.get('SELECT COUNT(*) as pending FROM users WHERE status = ?', ['pending'], (err, pendingCount) => {
        if (err) {
          return res.status(500).json({ error: 'Error fetching stats' });
        }

        db.get('SELECT COUNT(*) as total FROM files', (err, filesCount) => {
          if (err) {
            return res.status(500).json({ error: 'Error fetching stats' });
          }

          db.get('SELECT SUM(file_size) as total FROM files', (err, storageSize) => {
            if (err) {
              return res.status(500).json({ error: 'Error fetching stats' });
            }

            res.json({
              totalUsers: usersCount.total,
              pendingApprovals: pendingCount.pending,
              totalFiles: filesCount.total,
              totalStorage: storageSize.total || 0
            });
          });
        });
      });
    });
  });
});

// File Routes

// Upload file
app.post('/api/files/upload', requireAuth, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const { filename, originalname, size, mimetype } = req.file;
  const { department = 'mainoffice', category = 'report' } = req.body;

  db.run(
    'INSERT INTO files (user_id, filename, original_filename, file_size, file_type, department, category) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [req.session.userId, filename, originalname, size, mimetype, department, category],
    function(err) {
      if (err) {
        // Delete uploaded file if DB insert fails
        fs.unlinkSync(req.file.path);
        return res.status(500).json({ error: 'Error saving file metadata' });
      }

      res.json({
        message: 'File uploaded successfully',
        file: {
          id: this.lastID,
          filename: originalname,
          size,
          department,
          category,
          uploaded_at: new Date().toISOString()
        }
      });
    }
  );
});

// List user files
app.get('/api/files', requireAuth, (req, res) => {
  const { department = 'mainoffice', category = 'report' } = req.query;

  db.all(
    'SELECT id, original_filename as filename, file_size as size, department, category, uploaded_at FROM files WHERE user_id = ? AND department = ? AND category = ? ORDER BY uploaded_at DESC',
    [req.session.userId, department, category],
    (err, files) => {
      if (err) {
        return res.status(500).json({ error: 'Error retrieving files' });
      }
      res.json(files || []);
    }
  );
});

// Download file
app.get('/api/files/:fileId/download', requireAuth, (req, res) => {
  const { fileId } = req.params;

  db.get(
    'SELECT filename, original_filename FROM files WHERE id = ? AND user_id = ?',
    [fileId, req.session.userId],
    (err, file) => {
      if (err || !file) {
        return res.status(404).json({ error: 'File not found' });
      }

      const filePath = path.join(uploadsDir, `user_${req.session.userId}`, file.filename);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'File does not exist on disk' });
      }

      res.download(filePath, file.original_filename);
    }
  );
});

// Delete file
app.delete('/api/files/:fileId', requireAuth, (req, res) => {
  const { fileId } = req.params;

  db.get(
    'SELECT filename FROM files WHERE id = ? AND user_id = ?',
    [fileId, req.session.userId],
    (err, file) => {
      if (err || !file) {
        return res.status(404).json({ error: 'File not found' });
      }

      const filePath = path.join(uploadsDir, `user_${req.session.userId}`, file.filename);

      // Delete file from disk
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      // Delete from database
      db.run('DELETE FROM files WHERE id = ?', [fileId], (err) => {
        if (err) {
          return res.status(500).json({ error: 'Error deleting file' });
        }
        res.json({ message: 'File deleted successfully' });
      });
    }
  );
});

// Serve main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
