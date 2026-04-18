import mongoose from 'mongoose';

const fileSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    filename: {
      type: String,
      required: true
    },
    original_filename: {
      type: String,
      required: true
    },
    file_size: {
      type: Number,
      required: true
    },
    file_type: {
      type: String,
      required: true
    },
    cloudinary_url: {
      type: String,
      required: true,
      unique: true,
      sparse: true
    },
    cloudinary_id: {
      type: String,
      required: true,
      unique: true,
      sparse: true
    },
    department: {
      type: String,
      default: 'mainoffice'
    },
    category: {
      type: String,
      default: 'report'
    },
    uploaded_at: {
      type: Date,
      default: () => new Date()
    }
  },
  { timestamps: { createdAt: 'uploaded_at' } }
);

// Index for faster queries
fileSchema.index({ user_id: 1, uploaded_at: -1 });
fileSchema.index({ user_id: 1, department: 1, category: 1, uploaded_at: -1 });

export default mongoose.model('File', fileSchema);
