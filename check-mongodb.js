import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

async function checkMongoDB() {
  try {
    console.log('🔄 Connecting to MongoDB...\n');
    
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    console.log('📦 Collections in MongoDB:');
    collections.forEach(c => console.log(`  - ${c.name}`));
    
    // Check users collection
    const usersCount = await db.collection('users').countDocuments();
    console.log(`\n👤 Users: ${usersCount}`);
    const users = await db.collection('users').find().toArray();
    users.forEach(u => {
      console.log(`  - ${u.username} (${u.email}) - Status: ${u.status}, Role: ${u.role}`);
    });
    
    // Check files collection
    const filesCount = await db.collection('files').countDocuments();
    console.log(`\n📄 Files: ${filesCount}`);
    const files = await db.collection('files').find().toArray();
    files.forEach(f => {
      console.log(`  - ${f.original_filename}`);
      console.log(`    Size: ${(f.file_size / 1024 / 1024).toFixed(2)}MB`);
      console.log(`    URL: ${f.cloudinary_url.substring(0, 80)}...`);
      console.log(`    Uploaded: ${new Date(f.uploaded_at).toLocaleString()}`);
    });
    
    if (filesCount === 0) {
      console.log('  No files uploaded yet');
    }
    
    console.log('\n✅ MongoDB data check complete!');
    process.exit(0);
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

checkMongoDB();
