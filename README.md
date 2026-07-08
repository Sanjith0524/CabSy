# CampusRide 🚗

College-exclusive ride-matching platform. Connect with fellow students heading the same way and coordinate sharing a cab via Uber or Ola.

> CampusRide does **not** book rides or process payments — it only helps students discover compatible ride partners.

---

## 🔑 What You Need (External Services)

### 1. Firebase Project (free)
You need a Firebase project for Authentication + Firestore database.

**Steps:**
1. Go to https://console.firebase.google.com
2. Click **Add project** → give it a name (e.g. `campusride-mvp`)
3. Disable Google Analytics (not needed) → **Create project**

#### Enable Google Authentication
1. In Firebase Console → **Authentication** → **Get started**
2. Click **Google** under Sign-in providers → **Enable**
3. Enter your project's support email → **Save**

#### Enable Firestore Database
1. In Firebase Console → **Firestore Database** → **Create database**
2. Choose **Start in production mode** (you'll paste the rules below)
3. Select a region close to your users (e.g. `asia-south1` for India)

#### Get your Firebase config
1. In Firebase Console → **Project Settings** (gear icon) → **General**
2. Scroll to **Your apps** → click **</>** (Web)
3. Register the app (name it anything)
4. Copy the `firebaseConfig` object — you'll need these values for `.env.local`

---

## ⚙️ Environment Variables

Copy `.env.local.example` to `.env.local`:

```bash
cp .env.local.example .env.local
```

Fill in your Firebase values:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123

# Comma-separated, no spaces — add your college domains here
NEXT_PUBLIC_ALLOWED_DOMAINS=vitstudent.ac.in,vit.ac.in
```

> ⚠️ Never commit `.env.local` to git. It's already in `.gitignore`.

---

## 🔒 Deploy Firestore Security Rules

**Required before going live.**

Option A — Firebase Console (easiest):
1. Go to **Firestore Database** → **Rules** tab
2. Paste the contents of `firestore.rules`
3. Click **Publish**

Option B — Firebase CLI:
```bash
npm install -g firebase-tools
firebase login
firebase init firestore   # point to your project
firebase deploy --only firestore:rules,firestore:indexes
```

### Adding more college domains to rules
In `firestore.rules`, find the `isCollegeEmail()` function and add:
```
|| request.auth.token.email.matches('.*@yourcollege\\.edu\\.in')
```

---

## 🚀 Running Locally

```bash
# 1. Install dependencies
npm install

# 2. Start dev server
npm run dev
```

Open http://localhost:3000

---

## 🌐 Deploying to Vercel (free)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Follow prompts — it will ask for environment variables.
# Add each NEXT_PUBLIC_* variable from your .env.local.
```

Or connect your GitHub repo directly at https://vercel.com/new — Vercel will auto-deploy on every push.

**Add env vars in Vercel:**
1. Go to your Vercel project → **Settings** → **Environment Variables**
2. Add each variable from `.env.local`

---

## 📁 Project Structure

```
src/
├── app/
│   ├── page.tsx              # Landing / Login page
│   ├── dashboard/page.tsx    # Dashboard
│   ├── rides/
│   │   ├── page.tsx          # Ride feed
│   │   ├── create/page.tsx   # Create ride form
│   │   └── [id]/
│   │       ├── page.tsx      # Ride detail
│   │       └── chat/page.tsx # Chat room
│   └── profile/page.tsx      # User profile
├── components/
│   ├── layout/
│   │   ├── Navbar.tsx
│   │   └── ProtectedLayout.tsx
│   └── rides/
│       └── RideCard.tsx
├── lib/
│   ├── firebase.ts           # Firebase init + domain check
│   ├── auth-context.tsx      # Auth provider + Google sign-in
│   └── firestore.ts          # All DB operations
├── hooks/
│   └── use-require-auth.ts   # Auth guard
└── types/
    └── index.ts              # TypeScript types
```

---

## 🗂️ Firestore Collections

| Collection | Purpose |
|---|---|
| `users/{uid}` | User profiles (name, email, domain) |
| `rides/{rideId}` | Ride requests |
| `rides/{rideId}/members` | Members who joined a ride |
| `rides/{rideId}/messages` | Chat messages (auto-expiring) |

---

## ✅ Adding a New College

1. In `.env.local`: add domain to `NEXT_PUBLIC_ALLOWED_DOMAINS`
2. In `firestore.rules`: add a line to `isCollegeEmail()`
3. Redeploy rules + app

---

## 💰 Cost

Designed to run at **₹0** on free tiers:
- Firebase Spark (free): 50K reads/day, 20K writes/day, 1GB storage
- Vercel Hobby (free): unlimited deploys, 100GB bandwidth/month

Comfortably handles 200 active users at MVP stage.
