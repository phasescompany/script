# Phases Script — Aftermovie Intelligence

![Phases Script Banner](https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6)

**Phases Script** is a specialized tool for filmmakers and aftermovie directors to plan, manage, and track event captures using Gemini AI.

## 🚀 Key Features

- **AI Script Generation:** Leverages Gemini 1.5 Pro to create a structured narrative arc and detailed take lists (80-120 takes) based on event context.
- **Cast Management:** Organizes participants, priority, and importance. Support for CSV/Excel import.
- **Capture Tracking:** Real-time monitoring of captured vs. pending takes during the event.
- **Google Drive Integration:** Seamlessly connect to project folders for asset organization.
- **Face Detection:** Integrated AI support for identifying key participants in captured media.

## 🛠️ Tech Stack

- **Frontend:** React 19, Vite, Tailwind CSS, Framer Motion.
- **Backend:** Node.js, Express.
- **AI:** Google Gemini API (Gen AI SDK).
- **Storage:** LocalStorage (Project Data), Google Drive API.

## ⚙️ Setup

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Environment Variables:**
   Create a `.env` file (based on `.env.example`):
   - `GEMINI_API_KEY`: Your Google AI Studio API key.
   - `GOOGLE_CLIENT_ID`: Google OAuth2 Client ID for Drive integration.
   - `GOOGLE_CLIENT_SECRET`: Google OAuth2 Client Secret.

3. **Run Locally:**
   ```bash
   npm run dev
   ```

## 🌐 Deployment

The production version is hosted at `script.phasesco.com.br`.

---
*Created by [Phases](https://phasesco.com.br)*
