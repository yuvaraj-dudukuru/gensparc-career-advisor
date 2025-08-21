# GenSpark - Personalized Career & Skills Advisor

A production-ready MVP that provides personalized career recommendations and learning plans using Google Gemini AI, Firebase, and modern web technologies.

## 🚀 Features

- **AI-Powered Recommendations**: Get personalized career suggestions based on your skills and interests
- **Learning Plans**: 4-week structured learning paths with topics, practice, and projects
- **Smart Matching**: Advanced skill matching using cosine similarity and overlap analysis
- **Responsive Design**: Mobile-first, accessible interface
- **Secure**: Server-side AI processing with Firebase Authentication

## 🏗️ Architecture

- **Frontend**: Vanilla HTML, CSS, JavaScript (no frameworks)
- **Backend**: Firebase Cloud Functions with Express
- **Database**: Firestore for user profiles and recommendations
- **AI**: Google Gemini API for intelligent career guidance
- **Hosting**: Firebase Hosting with automatic API routing

## 📋 Prerequisites

- Node.js 18+ 
- Firebase CLI (`npm install -g firebase-tools`)
- Google Cloud account with Gemini API access
- Firebase project

## 🛠️ Setup

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd genspark-career-advisor
```

### 2. Firebase Setup

```bash
# Login to Firebase
firebase login

# Initialize project (use existing config)
firebase init
```

### 3. Configure Firebase Web Config

Edit `public/app.js` and fill in your Firebase project details:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

### 4. Set Gemini API Key

#### Option A: Environment File (Local Development)
```bash
cd functions
cp .env.example .env
# Edit .env and add: GEMINI_API_KEY="your_api_key_here"
```

#### Option B: Firebase Functions Config (Production)
```bash
firebase functions:config:set gemini.key="YOUR_GEMINI_API_KEY"
```

### 5. Install Dependencies

```bash
cd functions
npm install
```

## 🚀 Running Locally

```bash
# Start Firebase emulators
firebase emulators:start

# Open http://localhost:5000 in your browser
```

## 🚀 Deploy to Production

```bash
# Deploy everything
firebase deploy

# Or deploy specific services
firebase deploy --only hosting
firebase deploy --only functions
```

## 📚 API Documentation

### POST /api/recommend

Generates personalized career recommendations based on user profile.

**Request Body:**
```json
{
  "uid": "USER_UID",
  "profile": {
    "name": "string",
    "education": "12th | Diploma | UG | PG | Other",
    "skills": ["sql", "excel", "python"],
    "interests": ["data", "design", "cloud"],
    "weeklyTime": 8,
    "budget": "free",
    "language": "en"
  }
}
```

**Response:**
```json
{
  "recommendations": [
    {
      "roleId": "data_analyst",
      "title": "Data Analyst",
      "fitScore": 82,
      "why": "Explanation of fit...",
      "overlapSkills": ["sql", "excel"],
      "gapSkills": ["statistics", "tableau"],
      "plan": {
        "weeks": [
          {
            "week": 1,
            "topics": ["SQL basics", "Joins"],
            "practice": ["Solve 20 SQL tasks"],
            "assessment": "10-question quiz",
            "project": "Analyze retail sales CSV"
          }
        ]
      }
    }
  ]
}
```

## 🔒 Security

- **API Keys**: Never exposed to client-side code
- **Authentication**: Firebase Auth required for all operations
- **Data Access**: Users can only access their own data
- **CORS**: Restricted to Firebase Hosting origin only

## 🧪 Testing

### Manual Testing
Test with these personas:
1. **Fresh Graduate**: Basic skills, looking for entry-level roles
2. **Career Changer**: Some skills, wants to pivot
3. **Experienced Professional**: Advanced skills, seeking growth

### Unit Tests
```bash
cd functions
npm test
```

## 🐛 Troubleshooting

### Common Issues

**"Function not found"**
- Ensure Firebase Functions are deployed
- Check function name in `firebase.json`

**"CORS error"**
- Verify CORS origin matches your hosting domain
- Check Firebase Functions logs

**"Gemini API error"**
- Verify API key is set correctly
- Check API quota and billing

**"Authentication failed"**
- Ensure Firebase Auth is enabled
- Check web config in `public/app.js`

### Debug Mode

```bash
# View function logs
firebase functions:log

# View emulator logs
firebase emulators:start --only functions
```

## 📁 Project Structure

```
genspark-career-advisor/
├─ README.md                 # This file
├─ .gitignore               # Git ignore patterns
├─ firebase.json            # Firebase configuration
├─ .firebaserc             # Firebase project settings
├─ firestore.indexes.json  # Database indexes
├─ firestore.rules         # Security rules
├─ storage.rules           # Storage security
├─ public/                 # Frontend files
│  ├─ index.html          # Landing page
│  ├─ dashboard.html      # User dashboard
│  ├─ styles.css          # Main stylesheet
│  ├─ app.js             # Firebase & app logic
│  ├─ ui.js              # UI helpers
│  ├─ api.js             # API calls
│  └─ assets/logo.svg    # App logo
└─ functions/             # Backend functions
   ├─ package.json        # Dependencies
   ├─ index.js           # Express app
   ├─ prompts.js         # AI prompt builders
   ├─ roles.json         # Job role definitions
   ├─ utils.js           # Utility functions
   └─ .env.example       # Environment template
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For issues and questions:
1. Check the troubleshooting section
2. Review Firebase console logs
3. Open an issue in the repository

---

**Note**: Remember to never commit API keys or sensitive configuration. All keys should be set via environment variables or Firebase Functions config.
