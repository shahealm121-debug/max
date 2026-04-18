import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

async function testConnection() {
  try {
    console.log('🔄 Attempting to connect to MongoDB...');
    console.log('Connection URI:', process.env.MONGODB_URI?.replace(/:[^@]*@/, ':***@')); // Hide password
    
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('✅ Successfully connected to MongoDB!');
    
    // Check if database exists
    const db = mongoose.connection;
    console.log(`✅ Database: ${db.name}`);
    console.log(`✅ Host: ${db.host}`);
    
    // Try to list collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`✅ Collections: ${collections.map(c => c.name).join(', ') || 'None yet (will be created on first insert)'}`);
    
    // Create admin user to test
    const User = mongoose.model('User', new mongoose.Schema({
      username: String,
      email: String,
      password: String,
      role: String,
      status: String
    }), 'users');
    
    const adminExists = await User.findOne({ username: 'admin' });
    if (adminExists) {
      console.log('✅ Admin user exists in database');
    } else {
      console.log('⚠️  Admin user not found (will be created on first server start)');
    }
    
    await mongoose.disconnect();
    console.log('\n✨ Connection test completed successfully!');
    process.exit(0);
    
  } catch (err) {
    console.error('❌ Connection failed:', err.message);
    console.error('\nTroubleshooting:');
    console.error('1. Check if MongoDB_URI is correct in .env');
    console.error('2. Verify database password in connection string');
    console.error('3. Check if IP is whitelisted in MongoDB Atlas Network Access');
    console.error('4. Ensure database user credentials are correct');
    process.exit(1);
  }
}

testConnection();
