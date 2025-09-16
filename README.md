# EduPaper Backend API

Node.js/Express backend for the EduPaper online examination system.

## Features

- JWT Authentication
- Role-based access control (Student, Teacher, Admin)
- Paper management (CRUD operations)
- Exam attempt tracking
- Auto-grading for MCQ questions
- Manual grading for subjective questions
- Results and analytics

## Tech Stack

- Node.js & Express.js
- MongoDB with Mongoose
- JWT for authentication
- bcryptjs for password hashing
- Cloudinary for file uploads (optional)

## Quick Start

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Environment Setup**
   Create `.env` file:
   ```env
   MONGODB_URI=mongodb+srv://your-connection-string
   PORT=5000
   JWT_SECRET=your-super-secret-jwt-key
   NODE_ENV=production
   ```

3. **Development**
   ```bash
   npm run dev
   ```

4. **Production**
   ```bash
   npm start
   ```

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/refresh` - Refresh token

### Papers
- `GET /api/papers` - Get papers (role-based)
- `POST /api/papers` - Create paper (teacher)
- `PUT /api/papers/:id` - Update paper
- `DELETE /api/papers/:id` - Delete paper

### Attempts & Results
- `GET /api/papers/:id/attempt` - Start exam attempt
- `POST /api/papers/:id/submit` - Submit exam
- `GET /api/results/student/:id` - Get student results

## Deployment (Vercel)

1. **Connect to Vercel**
   ```bash
   vercel
   ```

2. **Set Environment Variables**
   - Add your MongoDB URI
   - Add JWT secret
   - Set NODE_ENV=production

3. **Deploy**
   ```bash
   vercel --prod
   ```

## Database Schema

- **Users**: Authentication and profiles
- **Papers**: Exam papers with questions
- **Attempts**: Student exam attempts
- **Results**: Graded exam results

Ready for production deployment! 🚀