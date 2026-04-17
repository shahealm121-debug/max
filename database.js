import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import bcryptjs from 'bcryptjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, 'users.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('Connected to SQLite database');
    initDatabase();
  }
});

function initDatabase() {
  // Create users table with role and approval status
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      status TEXT DEFAULT 'pending',
      approved_by INTEGER,
      approved_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('Error creating users table:', err);
    } else {
      console.log('Users table ready');
      createAdminUser();
    }
  });

  // Create files table
  db.run(`
    CREATE TABLE IF NOT EXISTS files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      filename TEXT NOT NULL,
      original_filename TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      file_type TEXT NOT NULL,
      cloudinary_url TEXT,
      cloudinary_id TEXT,
      department TEXT DEFAULT 'mainoffice',
      category TEXT DEFAULT 'report',
      uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `, (err) => {
    if (err) {
      console.error('Error creating files table:', err);
    } else {
      console.log('Files table ready');
      ensureFilesTableColumns();
    }
  });

  function ensureFilesTableColumns() {
    db.all('PRAGMA table_info(files)', (err, columns) => {
      if (err || !columns) {
        return;
      }

      const names = columns.map(c => c.name);

      if (!names.includes('department')) {
        db.run("ALTER TABLE files ADD COLUMN department TEXT DEFAULT 'mainoffice'", (alterErr) => {
          if (alterErr) {
            console.error('Error adding department column:', alterErr);
          }
        });
      }

      if (!names.includes('category')) {
        db.run("ALTER TABLE files ADD COLUMN category TEXT DEFAULT 'report'", (alterErr) => {
          if (alterErr) {
            console.error('Error adding category column:', alterErr);
          }
        });
      }

      if (!names.includes('cloudinary_url')) {
        db.run("ALTER TABLE files ADD COLUMN cloudinary_url TEXT", (alterErr) => {
          if (alterErr) {
            console.error('Error adding cloudinary_url column:', alterErr);
          }
        });
      }

      if (!names.includes('cloudinary_id')) {
        db.run("ALTER TABLE files ADD COLUMN cloudinary_id TEXT", (alterErr) => {
          if (alterErr) {
            console.error('Error adding cloudinary_id column:', alterErr);
          }
        });
      }
    });
  }
}

// Create default admin user if doesn't exist
function createAdminUser() {
  const adminPassword = bcryptjs.hashSync('admin123', 10);
  
  db.run(
    `INSERT OR IGNORE INTO users (username, email, password, role, status, created_at)
     VALUES (?, ?, ?, ?, ?, datetime('now'))`,
    ['admin', 'admin@localhost.local', adminPassword, 'admin', 'approved'],
    (err) => {
      if (err) {
        console.error('Error creating admin user:', err);
      } else {
        console.log('Admin user ready (username: admin, password: admin123)');
      }
    }
  );
}

export default db;
