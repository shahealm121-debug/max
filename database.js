import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import File from './models/File.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dms';

let isConnected = false;

export const connectDB = async () => {
  if (isConnected) {
    console.log('Using existing database connection');
    return;
  }

  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    isConnected = true;
    console.log('✅ Connected to MongoDB successfully');
    
    // Create default admin user if doesn't exist
    await createAdminUser();
    
  } catch (err) {
    console.error('❌ Error connecting to MongoDB:', err.message);
    process.exit(1);
  }
};

export const disconnectDB = async () => {
  if (isConnected) {
    await mongoose.disconnect();
    isConnected = false;
    console.log('Disconnected from MongoDB');
  }
};

async function createAdminUser() {
  try {
    const adminExists = await User.findOne({ username: 'admin' });
    
    if (!adminExists) {
      const admin = new User({
        username: 'admin',
        email: 'admin@localhost.local',
        password: 'admin123',
        role: 'admin',
        status: 'approved'
      });
      
      await admin.save();
      console.log('✅ Admin user created (username: admin, password: admin123)');
    } else {
      console.log('✅ Admin user already exists');
    }
  } catch (err) {
    console.error('Error creating admin user:', err);
  }
}

// Database operations wrapper
export const db = {
  User,
  File,
  
  // User operations
  createUser: async (username, email, password, role = 'user', status = 'pending') => {
    try {
      const user = new User({ username, email, password, role, status });
      return await user.save();
    } catch (err) {
      throw err;
    }
  },

  getUserByUsername: async (username) => {
    return await User.findOne({ username });
  },

  getUserById: async (id) => {
    return await User.findById(id);
  },

  getAllUsers: async () => {
    return await User.find().select('-password').sort({ created_at: -1 });
  },

  getPendingUsers: async () => {
    return await User.find({ status: 'pending' }).sort({ created_at: -1 });
  },

  approveUser: async (userId, adminId) => {
    return await User.findByIdAndUpdate(
      userId,
      {
        status: 'approved',
        approved_by: adminId,
        approved_at: new Date()
      },
      { new: true }
    );
  },

  rejectUser: async (userId) => {
    return await User.findByIdAndUpdate(
      userId,
      { status: 'rejected' },
      { new: true }
    );
  },

  // File operations
  uploadFile: async (userId, filename, originalFilename, size, mimetype, cloudinaryUrl, cloudinaryId, department, category) => {
    try {
      const file = new File({
        user_id: userId,
        filename,
        original_filename: originalFilename,
        file_size: size,
        file_type: mimetype,
        cloudinary_url: cloudinaryUrl,
        cloudinary_id: cloudinaryId,
        department,
        category
      });
      return await file.save();
    } catch (err) {
      throw err;
    }
  },

  checkDuplicate: async (userId, originalFilename, cloudinaryId, withinSeconds = 5) => {
    const fiveSecondsAgo = new Date(Date.now() - withinSeconds * 1000);
    return await File.findOne({
      user_id: userId,
      original_filename: originalFilename,
      cloudinary_id: cloudinaryId,
      uploaded_at: { $gt: fiveSecondsAgo }
    });
  },

  getUserFiles: async (userId, department, category) => {
    const files = await File.find({
      user_id: userId,
      department,
      category
    })
      .select('_id original_filename file_size department category uploaded_at')
      .sort({ uploaded_at: -1 })
      .lean();
    
    // Transform field names to match frontend expectations
    return files.map(file => ({
      id: file._id,
      filename: file.original_filename,
      size: file.file_size,
      department: file.department,
      category: file.category,
      uploaded_at: file.uploaded_at
    }));
  },

  getFileById: async (fileId, userId) => {
    return await File.findOne({
      _id: fileId,
      user_id: userId
    });
  },

  deleteFile: async (fileId, userId) => {
    return await File.findOneAndDelete({
      _id: fileId,
      user_id: userId
    });
  },

  getUserStats: async (userId) => {
    const files = await File.aggregate([
      { $match: { user_id: new mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: null,
          totalFiles: { $sum: 1 },
          totalStorage: { $sum: '$file_size' }
        }
      }
    ]);
    
    return files.length > 0
      ? { totalFiles: files[0].totalFiles, totalStorage: files[0].totalStorage }
      : { totalFiles: 0, totalStorage: 0 };
  },

  getAdminStats: async () => {
    const userStats = await User.aggregate([
      {
        $group: {
          _id: null,
          totalUsers: { $sum: 1 }
        }
      }
    ]);

    const pendingStats = await User.countDocuments({ status: 'pending' });

    const fileStats = await File.aggregate([
      {
        $group: {
          _id: null,
          totalFiles: { $sum: 1 },
          totalStorage: { $sum: '$file_size' }
        }
      }
    ]);

    return {
      totalUsers: userStats.length > 0 ? userStats[0].totalUsers : 0,
      pendingApprovals: pendingStats,
      totalFiles: fileStats.length > 0 ? fileStats[0].totalFiles : 0,
      totalStorage: fileStats.length > 0 ? fileStats[0].totalStorage : 0
    };
  }
};

export default db;
