# Vedam Open Source

Static website for the Vedam Open Source Club.

## Getting Started

### Local Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start development server:**
   ```bash
   npm run dev
   ```
   
   This starts a local server at `http://localhost:8001` with automatic environment variable replacement.

3. **Access the site:**
   - Open `http://localhost:8001` in your browser
   - All Firebase credentials are loaded from `.env` file

### Environment Setup

The `.env` file contains your Firebase configuration. This file is already configured but NOT committed to git for security.

If you need to update credentials:
1. Copy `.env.example` to `.env`
2. Fill in your Firebase credentials
3. Never commit `.env` to git!

## Deployment

### Netlify Deployment (Recommended)

See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for detailed instructions.

**Quick steps:**
1. Push code to GitHub
2. Connect repository to Netlify
3. Set environment variables in Netlify Dashboard
4. Deploy!

**Build command:** `npm install && npm run build`  
**Publish directory:** `.`

### Required Environment Variables for Netlify

Set these in Netlify Dashboard (Site Settings → Environment Variables):

All environment variables should be prefixed with `VITE_` + `FIREBASE_` followed by:
- API_KEY
- AUTH_DOMAIN  
- PROJECT_ID
- STORAGE_BUCKET
- MESSAGING_SENDER_ID
- APP_ID
- MEASUREMENT_ID

(Get these values from your Firebase Console → Project Settings)

## Security Notes

- **Environment variables:** All secrets are in `.env` (gitignored)
- **Source code:** Contains placeholders only, not real credentials
- **Build process:** CI/CD replaces placeholders with real values
- **Firebase rules:** Ensure proper security rules are configured
- **Authorized domains:** Add your deployment domain to Firebase Console

## Project Structure

```
/
├── index.html              # Landing page
├── login.html              # Authentication
├── dashboard.html          # User dashboard
├── profile.html            # Profile completion
├── github-connect.html     # GitHub integration
├── firebase-config.js      # Firebase configuration module
├── script.js               # Shared utilities
├── styles.css              # Global styles
├── build.js                # CI/CD build script
├── scripts/
│   └── dev-server.js       # Local development server
├── .env                    # Environment variables (gitignored)
├── .env.example            # Environment template
├── package.json            # Dependencies and scripts
└── netlify.toml            # Netlify configuration
```

## Available Scripts

- `npm run dev` - Start local development server (port 8001)
- `npm run build` - Build for production (CI/CD only)
- `npm start` - Serve built files (after build)

## Features

- Google OAuth authentication (@vedamsot.org only)
- GitHub integration and activity tracking
- Real-time community chat
- User profiles and dashboards
- GitHub statistics and visualizations
- Responsive design
- Mobile-friendly

## Technologies

- **Frontend:** Vanilla HTML/CSS/JavaScript
- **Backend:** Firebase (Auth, Firestore, Realtime Database)
- **Deployment:** Netlify
- **Charts:** Chart.js
- **Icons:** Font Awesome 6.0

