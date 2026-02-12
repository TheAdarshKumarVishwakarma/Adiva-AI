# Adiva AI Backend API

A production-ready Node.js/Express API powering an advanced AI chat application with multiple AI model integrations, user authentication, analytics, and comprehensive chat management features.

## 🚀 Features

### 🤖 AI Integration
- **Multiple AI Models**: OpenAI GPT, Claude AI, and other AI providers
- **Image Processing**: Advanced image analysis with AI vision models
- **Conversation Management**: Persistent chat history and session management
- **Model Comparison**: Side-by-side AI model performance analysis
- **Streaming Responses**: Real-time AI response streaming

### 🔐 Authentication & Security
- **Google OAuth**: Secure Google authentication integration
- **JWT Tokens**: Stateless authentication with JSON Web Tokens
- **Session Management**: Express sessions with secure cookie handling
- **Rate Limiting**: Protection against spam and abuse (100 requests per 15 minutes per IP)
- **Security Headers**: Helmet.js for comprehensive security
- **Input Validation**: Comprehensive form validation with express-validator

### 📊 Analytics & Monitoring
- **User Analytics**: Comprehensive user behavior tracking
- **Chat Statistics**: Detailed conversation analytics and insights
- **Usage Tracking**: AI model usage patterns and performance metrics
- **Health Checks**: API health monitoring endpoints
- **Request Logging**: Detailed request/response logging with Morgan

### 💾 Data Management
- **MongoDB Integration**: Scalable database with Mongoose ODM
- **User Profiles**: Complete user profile management
- **Chat Persistence**: Long-term conversation storage
- **Data Export**: User data export and backup functionality

### 🛡️ Production Ready
- **Graceful Shutdown**: Proper server shutdown handling
- **Compression**: Response compression for optimal performance
- **Error Handling**: Global error handling with proper HTTP status codes
- **Environment Configuration**: Flexible environment-based configuration
- **CORS Support**: Cross-origin resource sharing configuration

## 📁 Project Structure

```
backend/
├── config/
│   ├── database.js           # MongoDB connection configuration
│   └── googleAuth.js         # Google OAuth configuration
├── middleware/
│   ├── auth.js               # Authentication middleware
│   ├── errorHandler.js       # Global error handling
│   ├── rateLimiter.js        # Rate limiting middleware
│   └── validation.js         # Input validation middleware
├── models/
│   ├── User.js               # User model with authentication
│   ├── Chat.js               # Chat conversation model
│   ├── UserAnalytics.js      # User analytics tracking
│   └── UserSettings.js       # User settings model
├── routes/
│   ├── auth.js               # Authentication routes (login, register, OAuth)
│   ├── chat.js               # Chat API endpoints
│   ├── user.js               # User management routes
│   ├── analytics.js          # Analytics and statistics routes
│   ├── ai-models.js          # AI model management routes
│   └── index.js              # Main routes index
├── services/
│   ├── claudeService.js      # Claude AI integration service
│   └── analyticsService.js   # Analytics and tracking service
├── server.js                 # Main server file
├── package.json              # Dependencies and scripts
├── env.example               # Environment variables template
├── vercel.json               # Vercel deployment configuration
└── README.md                 # This file
```

## 🛠️ Installation & Setup

### Prerequisites
- **Node.js 18.0.0+** (Recommended: v18.0.0 or higher)
- **MongoDB** (Local installation or MongoDB Atlas)
- **OpenAI API Key** for AI chat functionality
- **Google OAuth Credentials** for authentication

### 1. Install Dependencies
```bash
npm install
```

### 2. Database Setup

#### Option A: MongoDB Atlas (Recommended)
1. Create a free account at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a new cluster
3. Get your connection string
4. Add your connection string to `.env`

#### Option B: Local MongoDB
1. Install MongoDB locally
2. Start MongoDB service
3. Use `mongodb://localhost:27017/aiva-ai` as connection string

### 3. AI API Keys Setup

#### OpenAI API Key
1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Create an account and get your API key
3. Add to `.env` file

#### Google OAuth (Optional)
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add credentials to `.env` file

### 4. Environment Configuration
```bash
# Copy the example file
cp env.example .env

# Edit .env with your settings
```

#### Required Environment Variables:
```env
# Server Configuration
PORT=3001
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/aiva-ai
# OR for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/aiva-ai

# AI Services
OPENAI_API_KEY=your_openai_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Authentication
JWT_SECRET=your_jwt_secret_here
SESSION_SECRET=your_session_secret_here

# Google OAuth (Optional)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3001/auth/google/callback

# Email Service (Optional)
GMAIL_USER=your_email@gmail.com
GMAIL_APP_PASSWORD=your_gmail_app_password
```

## 🚀 Running the Server

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

### Manual Start
```bash
node server.js
```

## 📡 API Endpoints

### Authentication
- **POST** `/api/auth/register` - User registration
- **POST** `/api/auth/login` - User login
- **POST** `/api/auth/logout` - User logout
- **GET** `/api/auth/profile` - Get user profile
- **PUT** `/api/auth/profile` - Update user profile
- **GET** `/auth/google` - Google OAuth login
- **GET** `/auth/google/callback` - Google OAuth callback

### Chat & AI
- **POST** `/api/chat` - Send message to AI
  - **Body**: `{ message, conversationId?, modelId?, systemPrompt? }`
  - **Rate Limited**: 100 requests per 15 minutes per IP
- **POST** `/api/chat-with-image` - Send message with image to AI
  - **Body**: `multipart/form-data` with `image`, `message`, `conversationId?`
- **GET** `/api/chat/history` - Get chat history
- **DELETE** `/api/chat/history/:conversationId` - Delete conversation

### User Management
- **GET** `/api/user/settings` - Get user settings
- **PUT** `/api/user/settings` - Update user settings
- **POST** `/api/user/export` - Export user data

### Analytics
- **GET** `/api/analytics/usage` - Get usage analytics
- **GET** `/api/analytics/chat-stats` - Get chat statistics
- **GET** `/api/analytics/model-performance` - Get AI model performance

### AI Models
- **GET** `/api/ai-models` - Get available AI models
- **POST** `/api/ai-models/test` - Test AI model connection

### Health Checks
- **GET** `/health` - General API health
- **GET** `/api/health` - Detailed service health

## 🤖 AI Model Configuration

The API supports multiple AI providers with flexible model selection:

### OpenAI Integration
- **GPT-4**: Latest GPT-4 model for advanced reasoning
- **GPT-4 Turbo**: Faster GPT-4 variant for real-time chat
- **GPT-3.5 Turbo**: Cost-effective option for general tasks
- **Vision Models**: GPT-4 Vision for image analysis

### Claude AI Integration
- **Claude 3 Opus**: Most capable model for complex tasks
- **Claude 3 Sonnet**: Balanced performance and speed
- **Claude 3 Haiku**: Fast and efficient for simple tasks

### Model Features:
- **Streaming Responses**: Real-time response streaming
- **Conversation Memory**: Context-aware conversations
- **Image Processing**: Multi-modal AI capabilities
- **Custom System Prompts**: Personalized AI behavior
- **Model Comparison**: Side-by-side performance testing

## 🔒 Security Features

- **Rate Limiting**: Prevents spam and abuse
- **Input Validation**: Sanitizes and validates all inputs
- **CORS**: Accepts requests from any origin (development-friendly)
- **Helmet.js**: Security headers
- **Request Logging**: Tracks all API requests
- **Error Handling**: Prevents information leakage
- **Compression**: Response compression for better performance

## 📦 Dependencies

### Production Dependencies:
```json
{
  "express": "^4.18.2",                    // Web framework
  "cors": "^2.8.5",                        // Cross-origin resource sharing
  "helmet": "^7.1.0",                      // Security headers
  "express-rate-limit": "^7.1.5",          // Rate limiting
  "express-validator": "^7.0.1",           // Input validation
  "morgan": "^1.10.0",                     // HTTP request logger
  "compression": "^1.7.4",                 // Response compression
  "mongoose": "^8.18.3",                   // MongoDB ODM
  "jsonwebtoken": "^9.0.2",                // JWT authentication
  "bcryptjs": "^3.0.2",                    // Password hashing
  "passport": "^0.7.0",                    // Authentication middleware
  "passport-google-oauth20": "^2.0.0",     // Google OAuth strategy
  "express-session": "^1.18.2",            // Session management
  "openai": "^5.13.1",                     // OpenAI API client
  "@anthropic-ai/sdk": "^0.61.0",          // Claude AI SDK
  "multer": "^2.0.2",                      // File upload handling
  "node-fetch": "^3.3.2",                  // HTTP client
  "dotenv": "^16.3.1"                      // Environment variables
}
```

### Development Dependencies:
```json
{
  "nodemon": "^3.0.2",                     // Auto-restart on file changes
  "jest": "^29.7.0"                        // Testing framework
}
```

## 🧪 Testing

### Run Tests
```bash
npm test
```

### Manual API Testing
```bash
# Test health endpoint
curl http://localhost:3001/health

# Test chat endpoint
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hello, how are you?",
    "conversationId": "test-conversation"
  }'

# Test authentication
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpassword123",
    "name": "Test User"
  }'
```

## 📊 Monitoring & Logging

The API includes comprehensive logging and analytics:
- **Request/Response Logging**: All API requests tracked with Morgan
- **AI Model Usage Tracking**: Monitor AI model performance and costs
- **User Analytics**: Track user behavior and engagement
- **Error Monitoring**: Detailed error logs with stack traces
- **Health Check Endpoints**: Service status monitoring
- **Chat Analytics**: Conversation patterns and insights

### Log Levels:
- **Development**: Detailed logs with request/response data
- **Production**: Optimized logs for performance and security

## 🚀 Deployment

### Environment Variables for Production:
```env
NODE_ENV=production
PORT=3001
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/aiva-ai
OPENAI_API_KEY=your_production_openai_key
ANTHROPIC_API_KEY=your_production_anthropic_key
JWT_SECRET=your_production_jwt_secret
SESSION_SECRET=your_production_session_secret
GOOGLE_CLIENT_ID=your_production_google_client_id
GOOGLE_CLIENT_SECRET=your_production_google_client_secret
```

### Recommended Hosting Platforms:
- **Vercel**: Easy deployment with serverless functions (see `vercel.json`)
- **Railway**: Simple Node.js deployment with MongoDB
- **Heroku**: Traditional hosting with MongoDB add-on
- **DigitalOcean**: VPS hosting with full control
- **Render**: Free tier available with MongoDB Atlas

### Deployment Commands:
```bash
# Install dependencies
npm install --production

# Start server
npm start

# Or use PM2 for production
npm install -g pm2
pm2 start server.js --name "aiva-ai-api"

# For Vercel deployment
vercel --prod
```

## 🔧 Troubleshooting

### Common Issues:

#### 1. Database Connection Error:
```
❌ MongoDB connection failed
```
**Solution**: Check MONGODB_URI in .env file and ensure MongoDB is running

#### 2. OpenAI API Key Error:
```
❌ OPENAI_API_KEY is required
```
**Solution**: Add valid OpenAI API key to .env file

#### 3. Authentication Issues:
```
401 Unauthorized
```
**Solution**: Check JWT_SECRET and session configuration

#### 4. Rate Limiting:
```
429 Too Many Requests
```
**Solution**: Wait 15 minutes or check rate limit headers

#### 5. CORS Errors:
```
CORS policy blocked request
```
**Solution**: API accepts all origins, check frontend URL

#### 6. Image Upload Issues:
```
413 Payload Too Large
```
**Solution**: Check file size limits and multer configuration

### Debug Commands:
```bash
# Check environment variables
node -e "console.log(process.env.OPENAI_API_KEY ? 'Set' : 'Not set')"

# Test database connection
node -e "
import connectDB from './config/database.js';
connectDB();
"

# Test AI service
node -e "
import OpenAI from 'openai';
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
console.log('OpenAI service:', openai ? 'Connected' : 'Not connected');
"
```

## 🔄 Migration Notes

### From Contact Form to AI Chat:
This backend has evolved from a simple contact form to a comprehensive AI chat platform:

1. **Database Migration**: Add MongoDB for user and chat data
2. **Authentication**: Implement user authentication system
3. **AI Integration**: Add OpenAI and Claude AI services
4. **Image Processing**: Support for multi-modal AI interactions

## 📝 API Response Format

### Chat Success Response:
```json
{
  "success": true,
  "message": "AI response here",
  "conversationId": "conv_123456",
  "timestamp": "2025-01-17T11:42:57.489Z",
  "model": "gpt-4",
  "usage": {
    "promptTokens": 50,
    "completionTokens": 100,
    "totalTokens": 150
  }
}
```

### Authentication Success Response:
```json
{
  "success": true,
  "message": "Authentication successful",
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "name": "John Doe"
  },
  "token": "jwt_token_here"
}
```

### Error Response:
```json
{
  "success": false,
  "message": "Error description",
  "error": "ERROR_TYPE",
  "code": 400
}
```

### Validation Error Response:
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "message",
      "message": "Message is required"
    }
  ]
}
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - feel free to use this in your projects!

## 👨‍💻 Author

**Adarsh Kumar Vishwakarma**
- Email: adarshvish2606@gmail.com
- GitHub: [Adarsh-Kumar-Vishwakarma](https://github.com/Adarsh-Kumar-Vishwakarma)
- LinkedIn: [Adarsh Kumar Vishwakarma](https://www.linkedin.com/in/adarsh-kumar-vishwakarma-6ba71a192/)

---

**Built with ❤️ using Node.js, Express, MongoDB, and AI Integration** 
