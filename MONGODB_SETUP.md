# MongoDB Cloud Database Setup Guide

Your app is now configured with **MongoDB Atlas** for persistent cloud metadata storage! 🎉

## ✅ What Changed

- ✅ **Persistent metadata storage** - File URLs no longer lost on server restart
- ✅ **Cloud-based database** - No local database file needed
- ✅ **Scalable solution** - Handles growth without server storage limits
- ✅ **MongoDB + Cloudinary** - Perfect pairing for complete cloud file management
- ✅ **Free tier available** - MongoDB Atlas offers 512MB free tier

---

## 🔧 Setup Instructions

### **Step 1: Create MongoDB Atlas Account**

1. Go to **mongodb.com/cloud/atlas**
2. Sign up for a free account
3. Verify your email
4. Create an organization and project

### **Step 2: Create a Cluster**

1. Click "Create" in MongoDB Atlas dashboard
2. Choose **"Shared"** cluster (free tier)
3. Select provider: **AWS**, Region: **us-east-1** (or your region)
4. Click "Create Cluster"
5. Wait for cluster to be created (5-10 minutes)

### **Step 3: Get Connection String**

1. In MongoDB Atlas dashboard, click your cluster
2. Click "Connect"
3. Select "Drivers"
4. Copy the connection string (looks like: `mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/dms?retryWrites=true&w=majority`)
5. Replace placeholders:
   - `<password>` - Your database password (save this!)
   - Database name is `dms` (already in URL)

### **Step 4: Create Database User**

1. Go to **Database Access** in left sidebar
2. Click "Add New Database User"
3. Set username and password (use strong password!)
4. Click "Add User"

### **Step 5: Setup Network Access**

1. Go to **Network Access** in left sidebar
2. Click "Add IP Address"
3. Select "Allow access from anywhere" (or add your IP)
4. Confirm

### **Step 6: Update `.env` File**

Create or update `.env` in your project root:

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name_here
CLOUDINARY_API_KEY=your_api_key_here
CLOUDINARY_API_SECRET=your_api_secret_here
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/dms?retryWrites=true&w=majority
PORT=3000
SESSION_SECRET=your-session-secret-change-in-production
NODE_ENV=development
```

**Replace:**
- `MONGODB_URI` - Your connection string from Step 3
- `CLOUDINARY_*` - Your Cloudinary credentials

### **Step 7: Install Dependencies**

```bash
npm install
```

This will install:
- ✅ `mongoose` - ODM for MongoDB
- ✅ All other dependencies (Cloudinary, Express, etc.)

### **Step 8: Start Server**

```bash
npm start
```

If using development mode with auto-reload:

```bash
npm run dev
```

You should see:

```
✅ Connected to MongoDB successfully
✅ Admin user created (username: admin, password: admin123)
🚀 Server is running on http://localhost:3000
```

---

## 📊 Monitoring Your Database

### **View Data in MongoDB Atlas**

1. Go to your cluster dashboard
2. Click "Collections"
3. Browse:
   - `users` - All user accounts and approvals
   - `files` - All file metadata with Cloudinary URLs
   - Timestamps show when uploaded

### **Check File Metadata** - When you upload a file, it stores:
- ✅ Cloudinary URL
- ✅ File size
- ✅ Original filename
- ✅ Upload timestamp
- ✅ Department & category

**This data persists across server restarts!**

### **Query Examples**

```javascript
// Count uploaded files
db.files.countDocuments()

// Find files by department
db.files.find({ department: "mainoffice" })

// Get total storage used
db.files.aggregate([{ $group: { _id: null, total: { $sum: "$file_size" } } }])
```

---

## 🚀 Deploy to Production

### **Render.com (Recommended)**

1. Push code to GitHub
2. Connect Render to GitHub
3. Create Web Service
4. Set environment variables in Render dashboard:
   ```
   MONGODB_URI=mongodb+srv://username:password@...
   CLOUDINARY_CLOUD_NAME=...
   CLOUDINARY_API_KEY=...
   CLOUDINARY_API_SECRET=...
   SESSION_SECRET=long-random-string
   NODE_ENV=production
   ```
5. Deploy!

### **Heroku Alternative**

```bash
heroku create your-app-name
heroku config:set MONGODB_URI="your-connection-string"
heroku config:set CLOUDINARY_CLOUD_NAME="your-name"
# ... set other variables
git push heroku main
```

---

## ✅ Migration from SQLite (If You Had Old Data)

If you had files uploaded before this migration:

1. **Files in Cloudinary remain** - Still accessible
2. **Metadata in old SQLite is lost** - This is expected
3. **New uploads store in MongoDB** - Persist across restarts
4. **Admin credentials reset** - Use `admin` / `admin123`

To recover old data:
- Export from old `users.db` SQLite file
- Contact support for manual migration help

---

## 🆘 Troubleshooting

### **"MongooseError: connect ECONNREFUSED"**
- Network access not enabled in MongoDB Atlas
- Wrong connection string in `.env`
- IP address not whitelisted

**Fix:**
```bash
# Check .env file
echo $MONGODB_URI

# Verify IP is whitelisted in Atlas Network Access
```

### **"Authentication Failed"**
- Wrong username/password in connection string
- Special characters in password not URL-encoded

**Fix:**
- Re-generate database user credentials in MongoDB Atlas
- Use URL-safe characters or URL-encode special chars

### **"Cannot find module 'mongoose'"**
```bash
npm install mongoose
```

### **Files Upload But Don't Appear After Restart**
- Old SQLite database was being used
- Make sure `MONGODB_URI` is set correctly
- Check server logs for MongoDB connection errors

---

## 📝 Key Features

✅ **Persistent Metadata** - URLs stored permanently  
✅ **Automatic Backups** - MongoDB Atlas handles backups  
✅ **Zero Downtime** - Server restarts don't lose data  
✅ **Scalable** - Grow from 0 to 1GB+ files  
✅ **Free Tier** - No cost until 512MB+ storage  
✅ **Global CDN** - Cloudinary handles fast downloads  
✅ **Secure** - SSL encryption for all connections  

---

## 🔐 Security Best Practices

1. **Never commit `.env`** - Add to `.gitignore`
2. **Use strong passwords** - Database user password
3. **Rotate secrets regularly** - `SESSION_SECRET`
4. **Limit IP access** - In production, whitelist specific IPs
5. **Enable MFA** - On MongoDB Atlas account
6. **Use environment variables** - Never hardcode credentials

---

## 📚 Additional Resources

- [MongoDB Atlas Quick Start](https://docs.atlas.mongodb.com/)
- [Mongoose Documentation](https://mongoosejs.com/)
- [Cloudinary + MongoDB Best Practices](https://cloudinary.com/blog/file_management_with_nodejs_and_mongodb)

---

## ✨ Next Steps

1. ✅ Set up MongoDB Atlas cluster
2. ✅ Create database user
3. ✅ Add connection string to `.env`
4. ✅ Run `npm install`
5. ✅ Start server with `npm start`
6. ✅ Test file upload → Check MongoDB Collections

**Everything working?** Your files are now permanently stored! 🎉
