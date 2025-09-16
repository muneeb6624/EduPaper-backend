# Deploy EduPaper Backend to Vercel

## Quick Deploy Steps

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy**
   ```bash
   vercel --prod
   ```

4. **Set Environment Variables in Vercel Dashboard**
   - `MONGODB_URI` - Your MongoDB connection string
   - `JWT_SECRET` - Strong secret key for JWT
   - `NODE_ENV` - Set to "production"

## Environment Variables

Copy from `.env.example` and update with your values:
- Get MongoDB URI from MongoDB Atlas
- Generate a strong JWT secret
- Optional: Add Cloudinary credentials for file uploads

## Database Setup

1. Create MongoDB Atlas account
2. Create a new cluster
3. Create database user
4. Whitelist Vercel IPs (or use 0.0.0.0/0 for all IPs)
5. Get connection string and add to Vercel environment variables

Your backend will be available at: `https://your-project.vercel.app`