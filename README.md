# Studio AI — Script-to-Video Creation Platform

An elite, full-stack AI-powered SaaS platform that automates the video creation workflow. It transforms a simple text prompt into a fully produced talking-head avatar video with natural voiceovers, custom avatars, and synchronized lip-syncing.

---

## 📖 Table of Contents
1. [Project Purpose & Overview](#-project-purpose--overview)
2. [Key Features & Functionality](#-key-features--functionality)
3. [Architecture & How It Works](#%EF%B8%8F-architecture--how-it-works)
4. [Technology Stack](#%EF%B8%8F-technology-stack)
5. [Database Schema & Data Model](#%EF%B8%8F-database-schema--data-model)
6. [Local Setup & Installation](#%EF%B8%8F-local-setup--installation)
7. [API Integrations](#-api-integrations)
8. [Deployment Guidelines](#-deployment-guidelines)

---

## 🎯 Project Purpose & Overview

The purpose of **Studio AI** is to democratize and accelerate video content creation. Historically, producing video content required expensive gear, hiring voice actors, filming human talent, and hours of video editing. 

This application collapses the entire lifecycle down to a **5-Step Automated Pipeline**:
1. **Idea Generation**: Enter a concept and choose your target style, language (English, Hindi, Hinglish), audience, and duration.
2. **Script Writing**: AI generates a multi-section, visual-cue-augmented script.
3. **Voice Synthesis**: Turn the script into premium, natural speech with customizable tone, emotion, pitch, and speed.
4. **Avatar Rendering**: An AI avatar speaks the generated script with precise mouth movement and facial expressions.
5. **Export & Preview**: Review, play, and download the completed MP4 video.

---

## 🌟 Key Features & Functionality

### 1. Interactive 5-Step Pipeline Wizard
*   **Step 1: Idea (Descriptor)**
    *   Dynamic prompt entry fields with word counters.
    *   Segmented target options: **Target Audience**, **Tone** (Professional, Casual, Energetic, Dramatic), and **Duration**.
    *   **Language Style Segment Toggle**: Select between standard English, conversational Hindi, and Hinglish (transliterated Hindi/Latin alphabet mixed naturally with everyday English words).
*   **Step 2: Script (Review & Edit)**
    *   AI-generated script segments partitioned into `HOOK`, `INTRO`, `BODY`, and `OUTRO`.
    *   Inline text editing with real-time word counting.
    *   Auto-saves edits locally and persists them in the database when transitioning.
*   **Step 3: Voice (Text-to-Speech)**
    *   **Custom Library Integration**: Pulls and searches custom voices in real-time from the user's personal ElevenLabs account.
    *   **Advanced Controls**: Interactive sliders to adjust speech **Speed** (0.5x - 2.0x) and **Pitch** (-20 to +20), and a dropdown to set voice **Emotion**.
    *   **Live Audio Previews**: Play preview clips of presets and custom voices.
    *   **Animated Wave Visualizer**: Visually pulses based on active audio playback.
*   **Step 4: Video (Avatar Generation)**
    *   Visual grid of preset HeyGen avatars.
    *   **Custom Avatar ID Input**: Enter any HeyGen Custom Avatar ID directly with live validation and preview cards.
    *   **Aspect Ratio Selector**: Portrait (9:16 for Reels/Shorts/TikTok), Landscape (16:9 for YouTube), and Square (1:1).
*   **Step 5: Export (Video Player)**
    *   Embedded HTML5 player with custom controls.
    *   Download buttons and direct link sharing.

### 2. Session & State Persistence
*   **Never Lose Progress**: Project states, script text edits, selected voices, range controls, and generated video links are permanently written to PostgreSQL.
*   **Auto-Resume**: Closing the tab or reloading the page automatically restores the exact step, form states, and generated assets.

### 3. Account Security & Key Encryption
*   **API Key Settings**: Stitched securely to users' profiles.
*   **AES-256 Encryption**: Keys for ElevenLabs and HeyGen are encrypted at rest in the database and decrypted on-the-fly during API execution.
*   **Test Connections**: Instantly tests key validity using lightweight endpoints to prevent API timeout issues.

### 4. Session Persistence (Remember Me)
*   Integrates a "Remember Me" checkbox on sign-in.
*   Checking the option extends NextAuth sessions to **30 days** using persistent cookies.
*   Unchecking strips cookie expiration parameters on credentials login, converting them to session-only cookies that wipe out when the browser is closed.

---

## ⚙️ Architecture & How It Works

### High-Level Data Flow

```mermaid
graph TD
    A[User Prompt + Settings] -->|POST /api/generate/script| B[NVIDIA NIM: Llama 3.1 70B]
    B -->|Persist Script Text| C[(PostgreSQL Database)]
    C -->|Fetch Script + Sliders| D[ElevenLabs API]
    D -->|Audio File Binary| E[TTS Output]
    E -->|Convert to Base64| C
    E -->|Register Voice Record| C
    C -->|Submit Video Request| F[HeyGen V2 API]
    G[Dynamic Public Audio Route] <--|Fetch Audio File| F
    F -->|Webhook / Video ID| H[Status Poller]
    H -->|Ready Video URL| C
    C -->|Stream Playback| I[Export View Video Player]
```

### 💡 The HeyGen / ElevenLabs Integration Bypass
**The Challenge**: By default, HeyGen requires users to integrate their ElevenLabs API key and clone voices *within their HeyGen dashboard* in order to use ElevenLabs voice IDs in HeyGen API payloads. Otherwise, HeyGen throws an `Invalid voice_id` error.

**Our Solution**:
1. We generate the audio using the user's ElevenLabs API key directly in **Step 3** and save the resulting MP3 binary as a Base64 string in our database.
2. We created a public, unauthenticated API endpoint at `/api/audio/[voiceId]` that decodes the database Base64 audio and streams it as a standard binary stream with `Content-Type: audio/mpeg`.
3. In **Step 4**, the app submits the video payload to HeyGen with:
   ```json
   "voice": {
     "type": "audio",
     "audio_url": "https://script-to-video-platform.vercel.app/api/audio/[voiceId]"
   }
   ```
4. HeyGen fetches the audio directly from our server, lip-syncs the avatar, and renders the video. This eliminates account linking friction and preserves speed, pitch, and emotion settings.

---

## 🛠️ Technology Stack

| Layer | Technology Used | Description |
| :--- | :--- | :--- |
| **Frontend** | **Next.js 14 (App Router)** | Framework for SSR, dynamic layouts, and hydration. |
| **Frontend** | **TypeScript** | Static typing ensuring component-level type-safety. |
| **Frontend** | **TailwindCSS** | Utility-first styling for responsive layout design. |
| **State Sync** | **Zustand** | Light, global client-side UI store managing URL sync & tabs. |
| **Data Fetch** | **TanStack Query (React Query)** | Manages server state cache, mutators, and polling. |
| **Database** | **PostgreSQL** | Relational database containing auth and project schemas. |
| **ORM** | **Prisma** | Database ORM used for migrations and type-safe queries. |
| **Driver Adapter**| **PrismaPg + pg** | Node.js PostgreSQL pool client adapter. |
| **Auth** | **Auth.js (NextAuth v5)** | Authentication layer managing Credentials & provider sessions. |
| **AI LLM** | **NVIDIA NIM** | Completion endpoint running Llama 3.1 70B Instruct. |
| **AI TTS** | **ElevenLabs** | Voice generation endpoint. |
| **AI Video** | **HeyGen V2 / V3** | Digital Avatar video generation and lip-sync rendering. |

---

## 🗄️ Database Schema & Data Model

We use the following core tables inside PostgreSQL (managed by Prisma):

```
┌─────────────────┐       ┌─────────────────┐       ┌───────────────────┐
│      User       │───────│     Project     │───────│ GenerationHistory │
└─────────────────┘       └─────────────────┘       └───────────────────┘
         │                         │                          │
         │                         ├─────────────────┐        │
         │                         │                 │        │
┌─────────────────┐       ┌─────────────────┐       ┌───────────────────┐
│   ProviderKey   │       │     Script      │       │       Voice       │
└─────────────────┘       └─────────────────┘       └───────────────────┘
```

*   **`User`**: Core user accounts.
*   **`Project`**: The main workflow state. Stores configuration parameters (aspect ratio, status, pipeline step) and pointers to current assets.
*   **`Script`**: Holds generated script versions, tones, and target languages.
*   **`Voice`**: Stores generated ElevenLabs voice details, audio URLs (as Base64 data URLs), and configuration sliders (speed, pitch, emotion).
*   **`ProviderKey`**: Stores encrypted API keys (ELEVENLABS, HEYGEN) mapped to specific users.
*   **`GenerationHistory`**: Audit trail tracking progress, metadata, and error details of LLM, TTS, and video jobs.

---

## 🖥️ Local Setup & Installation

### Prerequisites
*   Node.js (v18.x or higher)
*   PostgreSQL database instance running locally or hosted on the cloud (e.g. Supabase, Neon)

### Step 1: Clone and Install Dependencies
```bash
git clone <repository-url>
cd SCRIPT-AI
npm install
```

### Step 2: Configure Environment Variables
Create a `.env.local` file in the root directory and add the following keys:
```env
# Database Connection
DATABASE_URL="postgresql://<user>:<password>@<host>:<port>/<db>?sslmode=require"

# Auth.js Secrets
NEXTAUTH_SECRET="your-generated-nextauth-secret-key"
NEXTAUTH_URL="http://localhost:3000"

# Encryption Key (Must be 32 bytes hex for AES-256-CBC)
ENCRYPTION_KEY="0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"

# AI Provider Access Keys (System wide fallback if user key is absent)
NVIDIA_API_KEY="nvapi-xxxx"
```

### Step 3: Run Database Migrations
Deploy the Prisma schema to your PostgreSQL database:
```bash
npx prisma db push
npx prisma generate
```

### Step 4: Start the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to access the platform.

---

## 🔌 API Integrations

### 1. NVIDIA NIM (Llama 3.1 70B Instruct)
*   **Endpoint**: `https://integrate.api.nvidia.com/v1/chat/completions`
*   **Purpose**: Generates video scripts. It interprets serialized JSON parameters (Concept, Target Audience, Tone, Duration) and returns a formatted video script with visual segment guides.

### 2. ElevenLabs Text-to-Speech
*   **Endpoint**: `https://api.elevenlabs.io/v1/text-to-speech/{voice_id}`
*   **Purpose**: Renders natural voice audio from the script. Custom settings (speed, pitch, emotion) are integrated during API synthesis.

### 3. HeyGen Avatar Video Generation
*   **Endpoint**: `https://api.heygen.com/v2/video/generate`
*   **Purpose**: Renders the final talking avatar video. It takes the avatar ID, dimensions, and dynamic audio URL, rendering a download-ready MP4.

---

## 🚀 Deployment Guidelines

The project is fully optimized for **Vercel** deployment:
1. Ensure all environment variables (e.g. `DATABASE_URL`, `NEXTAUTH_SECRET`, `ENCRYPTION_KEY`) are configured in your Vercel Project Settings.
2. Vercel will automatically run `"postinstall": "prisma generate"` as defined in `package.json` to configure Prisma client libraries during builds.
3. Keep the PostgreSQL instance close to Vercel's region (e.g. `us-east-1` or your default region) to minimize database query latency.
