# Tong - Real-Time Video Language Learning Platform (Supabase Edition)
## Implementation Guide & Development Tasks

This document serves as a comprehensive guide and task list for developing the Tong platform.

## 1. Project Overview

Tong is a multi-faceted language learning platform featuring:
*   **Vocabulary & Grammar:** Quizlet/Duolingo-style learning modules.
*   **Live Lessons:** Scheduled 1-on-1 video sessions with verified teachers.
*   **AI Analysis:** Post-session transcription and feedback.
*   **Competitive Practice:** ELO-rated, Omegle-style quick video matches.

The goal is a cohesive learning cycle: foundational study -> structured practice -> spontaneous application.

## 2. Technical Stack

*   **Frontend:** Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS (`#001524`, `#15616D`, `#FFECD1`)
*   **Backend:** Supabase (Auth, PostgreSQL, Realtime, Storage)
*   **Real-Time Video:** WebRTC (PeerJS or raw API)
*   **AI:** OpenAI Whisper/AssemblyAI (Transcription), OpenAI GPT-4 (Analysis)
*   **Deployment:** Vercel (Frontend), Supabase (Backend), Dedicated TURN Server (Optional but recommended)

## 3. Core System Architecture

### 3.1. Supabase Setup

*   **Authentication:**
    *   `- [ ]` Implement email/password signup/login using `supabase.auth.signUp`/`signInWithPassword`. (Ref: `src/utils/supabase/server.js`, `src/utils/supabase/client.js`)
    *   `- [ ]` Implement Google OAuth provider using `supabase.auth.signInWithOAuth`.
    *   `- [ ]` Create `profiles` table to store user data including `user_id` (FK to `auth.users`), `role` (enum: 'learner', 'teacher', 'admin'), `full_name`, `avatar_url`, `is_teacher_verified` (boolean).
    *   `- [ ]` Implement profile creation/update logic upon signup and in user settings.
    *   `- [ ]` Set up Row Level Security (RLS) policies on ALL tables to restrict access based on user roles and ownership (e.g., users can only update their own profile, teachers can see their assigned sessions).
*   **Database (PostgreSQL):**
    *   `- [ ]` Define initial schema (see Section 5).
    *   `- [ ]` Set up database migrations strategy (e.g., using Supabase CLI migrations).
    *   `- [ ]` Implement required database indexes (see Section 8.2).
*   **Realtime:**
    *   `- [ ]` Enable Realtime for relevant tables (`sessions`, `session_signals`, potentially `notifications`).
    *   `- [ ]` Use Realtime subscriptions on the client-side for features like session notifications, signaling, matchmaking presence. (Ref: `src/utils/supabase/client.js`)
*   **Storage:**
    *   `- [ ]` Configure Supabase Storage for user avatars, potentially session recordings (consider compliance), and teacher verification documents.
    *   `- [ ]` Implement RLS policies for Storage buckets.

### 3.2. WebRTC Implementation

*   **Signaling:**
    *   `- [ ]` Choose signaling mechanism: Supabase Realtime is preferred.
    *   `- [ ]` Define a dedicated Supabase Realtime channel pattern for session signaling (e.g., `session-signals:<session_id>`).
    *   `- [ ]` Alternatively, create a `session_signals` table (`session_id`, `sender_id`, `signal_type` ('offer', 'answer', 'ice'), `payload` (jsonb)) and use Realtime subscriptions on this table.
    *   `- [ ]` Implement logic to exchange SDP offers/answers and ICE candidates between peers via the chosen signaling channel/table. (Ref: `src/utils/webrtc.js`, `src/app/call/[roomId]/page.jsx`)
*   **Peer Connection:**
    *   `- [ ]` Use `RTCPeerConnection` API (or PeerJS library abstraction).
    *   `- [ ]` Implement STUN/TURN server configuration. Use Supabase's default STUN or set up a dedicated TURN server for reliability, especially behind restrictive NATs. Store TURN credentials securely.
    *   `- [ ]` Handle ICE candidate gathering and exchange.
    *   `- [ ]` Manage media streams (audio/video).
    *   `- [ ]` Implement connection state handling (connecting, connected, disconnected, failed).
    *   `- [ ]` Enforce DTLS-SRTP encryption (default in modern browsers).
*   **Video Call UI:** (Ref: `src/app/call/[roomId]/page.jsx`, `src/app/components/VideoCall.js`)
    *   `- [ ]` Implement pre-session device check (mic/camera permissions, selection).
    *   `- [ ]` Display local and remote video streams.
    *   `- [ ]` Add controls for mute/unmute mic, enable/disable video.
    *   `- [ ]` Show connection status indicator.
    *   `- [ ]` Implement emergency exit button.

### 3.3. AI Integration Pipeline

*   **Transcription:**
    *   `- [ ]` Choose transcription service (Whisper/AssemblyAI).
    *   `- [ ]` Determine audio source: Client-side recording (requires user consent and upload) or server-side processing (more complex with WebRTC). Client-side is likely simpler for MVP.
    *   `- [ ]` If client-side: Implement audio recording during the session using `MediaRecorder` API.
    *   `- [ ]` Implement secure upload of recorded audio (e.g., directly to Supabase Storage or via a backend endpoint).
    *   `- [ ]` Create a serverless function (e.g., Supabase Edge Function) or backend route (`src/api/...`) triggered after session completion/audio upload.
    *   `- [ ]` This function sends the audio to the chosen transcription API.
    *   `- [ ]` Store the resulting transcript associated with the session ID in the database (e.g., `sessions` table or a dedicated `transcripts` table).
*   **Session Analysis:**
    *   `- [ ]` Create another serverless function/backend route triggered after transcription is complete.
    *   `- [ ]` This function takes the transcript text.
    *   `- [ ]` Craft a detailed prompt for GPT-4 to analyze the transcript for: grammar mistakes, pronunciation feedback (based on text), conversation flow, politeness, key vocabulary used, areas for improvement.
    *   `- [ ]` Send the prompt and transcript to the GPT-4 API.
    *   `- [ ]` Store the structured analysis results (JSON format recommended) associated with the session ID (e.g., in the `sessions` table or a dedicated `session_analysis` table).
*   **Game Mode Analysis:**
    *   `- [ ]` Adapt the pipeline for batch analysis.
    *   `- [ ]` Store transcripts for each of the 5 game matches.
    *   `- [ ]` After the 5th match, trigger a function that concatenates/processes the 5 transcripts.
    *   `- [ ]` Send the combined data to GPT-4 for analysis focused on progress, common errors across games, and ELO-relevant metrics (complexity, error rate).
    *   `- [ ]` Store the batch analysis result.

## 4. Detailed Feature Implementation Guides

### 4.1. Authentication & Roles

*   **Tasks:**
    *   `- [ ]` Implement UI components for Login (`src/app/login/page.jsx`) and Register (`src/app/register/page.jsx`).
    *   `- [ ]` Connect UI to Supabase auth functions (`src/utils/auth.js`, Supabase client/server utils).
    *   `- [ ]` Implement profile creation logic linked to `auth.users` upon signup.
    *   `- [ ]` Create `AuthProvider` context (`src/context/AuthProvider.jsx`) to manage user session state globally.
    *   `- [ ]` Implement middleware (`src/middleware.js`) using `src/utils/supabase/middleware.js` to protect routes based on authentication status and roles (`/dashboard`, `/teach`, `/admin`).
    *   `- [ ]` Develop Teacher Verification flow:
        *   `- [ ]` UI for teachers to submit verification requests/documents.
        *   `- [ ]` Admin interface (`src/app/admin/page.jsx`) to review requests and approve/reject teachers (updating `profiles.is_teacher_verified`).
        *   `- [ ]` Secure storage for verification documents if needed.

### 4.2. Quizlet/Duolingo Style Learning

*   **Tasks:**
    *   `- [ ]` Design database schema for vocabulary, grammar rules, lessons, and user progress (e.g., `languages`, `lesson_modules`, `vocab_items`, `grammar_rules`, `user_module_progress`).
    *   `- [ ]` Create API endpoints (`src/api/...`) or use Supabase client directly to fetch learning content.
    *   `- [ ]` Develop UI components for displaying flashcards, multiple-choice questions, fill-in-the-blanks, etc.
    *   `- [ ]` Implement logic to track user progress through modules.
    *   `- [ ]` Design an admin interface or developer process for easily adding new languages and learning content.

### 4.3. Session Scheduling & Lifecycle

*   **Tasks:**
    *   `- [ ]` Create `sessions` table (see Section 5).
    *   `- [ ]` Develop UI for learners to browse available teachers (filtered by language, rating, availability). (Potentially part of `src/app/dashboard/page.jsx`)
    *   `- [ ]` Implement teacher availability management (teachers set their available time slots).
    *   `- [ ]` Create UI component (`src/app/components/CreateSessionRequest.jsx`?) for learners to select teacher/time and request a session.
    *   `- [ ]` Implement API endpoint (`src/app/api/sessions/route.js`) or server-side logic to:
        *   Check teacher availability.
        *   Create a new session record in the `sessions` table with status 'pending'.
    *   `- [ ]` Implement Realtime notification to the teacher about the new request. (Use Supabase Realtime on `sessions` table or a dedicated `notifications` table).
    *   `- [ ]` Develop Teacher Dashboard (`src/app/dashboard/page.jsx` or `/teach`) component (`src/app/components/SessionRequests.jsx`?) to display incoming requests.
    *   `- [ ]` Implement logic for teachers to accept/reject requests (updating `sessions.status` to 'confirmed' or 'rejected').
    *   `- [ ]` Implement Realtime notification back to the learner about the status update.
    *   `- [ ]` Develop UI (`src/app/components/SessionList.jsx`?) for both learners and teachers to see upcoming confirmed sessions.
    *   `- [ ]` Implement logic to generate a unique room ID (UUID) for confirmed sessions and store it in `sessions.room_id`.
    *   `- [ ]` Create the video call page (`src/app/call/[roomId]/page.jsx`) that uses the `roomId` parameter.
    *   `- [ ]` Add logic to update `sessions.status` to 'ongoing', 'completed', 'cancelled'.
    *   `- [ ]` Implement post-session flow triggers (e.g., updating status to 'processing_analysis' after completion, triggering transcription/analysis pipeline).

### 4.4. AI Analysis Display

*   **Tasks:**
    *   `- [ ]` Create UI components to display the AI analysis results associated with a completed session. (Likely part of session history in `src/app/dashboard/page.jsx`).
    *   `- [ ]` Fetch analysis data from the database based on session ID.
    *   `- [ ]` Present the feedback clearly (grammar, pronunciation notes, flow score, etc.).
    *   `- [ ]` Implement UI for displaying the batch analysis results after 5 game mode matches.

### 4.5. Competitive Game Mode (Omegle-style)

*   **Tasks:**
    *   `- [ ]` Design ELO system:
        *   `- [ ]` Create `users_elo` table (`user_id`, `language`, `score`, `last_updated`).
        *   `- [ ]` Implement initial ELO assignment (perhaps based on assessment).
        *   `- [ ]` Define ELO calculation logic based on game outcomes and AI analysis metrics (complexity, error rate, peer ratings?).
    *   `- [ ]` Implement Matchmaking:
        *   `- [ ]` Use Supabase Realtime Presence for a `global_matchmaking:<language>` channel to track users waiting for a game.
        *   `- [ ]` When a user joins the queue, broadcast their `user_id` and `elo_score` via Presence.
        *   `- [ ]` Implement client-side or server-side (Edge Function) logic to listen to presence events (`join`/`leave`).
        *   `- [ ]` When a potential match is found (within ±100 ELO range), attempt to establish a connection. Use a locking mechanism (e.g., a temporary DB record) to prevent race conditions where two users try to match with the same third user.
        *   `- [ ]` Once matched, generate a unique room ID and redirect both users to the call page (`src/app/call/[roomId]/page.jsx`).
        *   `- [ ]` Remove matched users from the matchmaking presence channel.
    *   `- [ ]` Implement Game Session Logic:
        *   `- [ ]` Enforce 5-minute time limit.
        *   `- [ ]` Trigger audio recording for transcription.
        *   `- [ ]` Implement post-game flow (store transcript, check if 5th game, trigger batch analysis/ELO update if needed).
    *   `- [ ]` Implement Anti-Cheat/Moderation:
        *   `- [ ]` Consider basic voice pattern consistency checks if feasible.
        *   `- [ ]` Implement user reporting system during/after games.
        *   `- [ ]` Add flags/review queues for admins based on reports or automated checks.

### 4.6. Language Assessment

*   **Tasks:** (Ref: `src/app/assessment/page.jsx`, `src/app/api/assessments/...`)
    *   `- [ ]` Design the assessment format (e.g., multiple choice, short answer, potentially a recorded speaking component analyzed by AI).
    *   `- [ ]` Create database tables (`assessments`, `assessment_questions`, `user_assessment_results`).
    *   `- [ ]` Implement API endpoints for fetching assessment questions and submitting answers.
    *   `- [ ]` Develop UI for taking the assessment.
    *   `- [ ]` Implement scoring logic.
    *   `- [ ]` Store results and use them to set initial ELO or language level.
    *   `- [ ]` Adapt assessment for teacher expertise verification if needed.

## 5. Database Schema Overview (Initial Ideas)

*   **`profiles`**: `id` (uuid, PK, default: `uuid_generate_v4()`), `user_id` (uuid, FK to `auth.users`, unique), `role` (enum: 'learner', 'teacher', 'admin'), `full_name` (text), `avatar_url` (text), `created_at` (timestamptz), `updated_at` (timestamptz), `is_teacher_verified` (boolean, default: false).
*   **`languages`**: `id` (serial, PK), `name` (text, unique), `code` (text, unique, e.g., 'en', 'es').
*   **`sessions`**: `id` (uuid, PK), `learner_id` (uuid, FK to `profiles`), `teacher_id` (uuid, FK to `profiles`), `language_id` (int, FK to `languages`), `scheduled_time` (timestamptz), `duration_minutes` (int), `status` (enum: 'pending', 'confirmed', 'rejected', 'cancelled', 'ongoing', 'completed', 'processing_analysis', 'analysis_complete', 'error'), `room_id` (uuid, unique), `created_at`, `updated_at`, `transcript` (text, nullable), `analysis_result` (jsonb, nullable).
*   **`users_elo`**: `id` (serial, PK), `user_id` (uuid, FK to `profiles`), `language_id` (int, FK to `languages`), `score` (int, default: 1000), `last_updated` (timestamptz). (Add unique constraint on `user_id`, `language_id`).
*   **`session_signals`** (If using table-based signaling): `id` (bigserial, PK), `session_id` (uuid, FK to `sessions`), `sender_id` (uuid, FK to `profiles`), `recipient_id` (uuid, FK to `profiles`), `signal_type` (enum: 'offer', 'answer', 'ice'), `payload` (jsonb), `created_at`.
*   **Learning Content Tables:** `lesson_modules`, `vocab_items`, `grammar_rules`, `user_module_progress`, etc. (To be designed).
*   **Assessment Tables:** `assessments`, `assessment_questions`, `user_assessment_results` (To be designed).

*Self-Note: Ensure appropriate RLS policies are defined for every table.*

## 6. API Endpoint Strategy (Examples)

*   `POST /api/sessions`: Create a session request.
*   `PUT /api/sessions/[sessionId]`: Update session status (confirm, reject, cancel, complete).
*   `GET /api/sessions`: Get user's sessions (learner or teacher).
*   `GET /api/teachers`: Get list of available teachers (with filters).
*   `POST /api/assessments/[assessmentId]/submit`: Submit assessment answers.
*   `POST /api/calls/signal`: (If not using Realtime directly) Endpoint for relaying WebRTC signals.
*   `POST /api/ai/transcribe`: Endpoint to trigger transcription (called internally).
*   `POST /api/ai/analyze`: Endpoint to trigger analysis (called internally).

*Self-Note: Leverage Supabase server-side functions (`src/utils/supabase/server.js`) and Edge Functions where possible instead of custom API routes for direct DB interaction.*

## 7. Getting Started

1.  **Clone:** `git clone <repository-url> && cd tong`
2.  **Install:** `npm install`
3.  **Environment:**
    *   Copy `.env.example` to `.env.local`.
    *   Fill in Supabase `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
    *   Add API keys for AI services (`OPENAI_API_KEY`, etc.).
    *   Configure TURN server credentials if using a dedicated one.
4.  **Supabase Setup:**
    *   `- [ ]` Set up the database schema (using SQL editor or migrations).
    *   `- [ ]` Configure Auth settings (providers, email templates).
    *   `- [ ]` Set up Storage buckets and policies.
    *   `- [ ]` Define RLS policies.
5.  **Run Dev:** `npm run dev` (Access at http://localhost:3000)

## 8. Testing Strategy

*   **Unit Tests:** For utility functions, complex logic (e.g., ELO calculation).
*   **Integration Tests:** Test interactions between components, API calls, Supabase functions.
*   **E2E Tests:** Simulate user flows (signup, schedule session, join call, complete game). (Consider Playwright or Cypress).
*   **Load Testing:**
    *   `- [ ]` Simulate concurrent WebRTC sessions.
    *   `- [ ]` Test matchmaking request throughput.
*   **Manual Testing:** Cover edge cases, different browsers, network conditions.
*   **Specific Scenarios:**
    *   `- [ ]` Test Realtime disconnect/reconnect recovery.
    *   `- [ ]` Test WebRTC ICE restart procedures.
    *   `- [ ]` Test session continuity after brief network drops.
    *   `- [ ]` Test localization/timezone issues in scheduling.

## 9. Deployment & Monitoring

*   **Infrastructure:** Vercel (Frontend), Supabase (Backend), Dedicated TURN Server (Recommended).
*   **CI/CD:**
    *   `- [ ]` Set up GitHub Actions (or similar) for automated builds, tests, and deployments.
    *   `- [ ]` Implement automated Supabase schema migrations in the pipeline.
    *   `- [ ]` Use Vercel preview deployments for PRs.
*   **Monitoring:**
    *   `- [ ]` Implement logging (e.g., using Vercel logs, Supabase logs, or a dedicated logging service). Log key events, errors, API timings.
    *   `- [ ]` Set up monitoring dashboards (e.g., Grafana, Vercel Analytics, Supabase observability) for key metrics (API latency, error rates, matchmaking queue times, AI processing latency).
    *   `- [ ]` Implement error tracking (e.g., Sentry).

## 10. Roadmap (Phased Implementation Tasks)

### Phase 1 (MVP)

*   `- [ ]` Core Auth (Email/Pass + Google) & Profile Management
*   `- [ ]` Basic Session Scheduling (Learner requests, Teacher accepts/rejects)
*   `- [ ]` Core 1-on-1 WebRTC Video Chat
*   `- [ ]` Basic AI Transcription & Analysis Pipeline (Triggered post-session)
*   `- [ ]` Display AI Feedback on Session History
*   `- [ ]` ELO System Prototype (DB table, basic assignment)
*   `- [ ]` Initial Supabase Setup (Schema, RLS for MVP features)
*   `- [ ]` Basic Dashboard UI for Learner/Teacher

### Phase 2

*   `- [ ]` Advanced Matchmaking Algorithm (ELO-based, presence)
*   `- [ ]` Competitive Game Mode Implementation (5-min limit, batch analysis)
*   `- [ ]` ELO Calculation & Update Logic
*   `- [ ]` Multi-language Support (DB schema, UI)
*   `- [ ]` Teacher Verification Flow & Admin Interface
*   `- [ ]` Teacher Payment System Integration (e.g., Stripe Connect)
*   `- [ ]` Refine UI/UX based on MVP feedback
*   `- [ ]` Implement Comprehensive Testing

### Phase 3

*   `- [ ]` Mobile App Development (React Native) - Requires separate planning
*   `- [ ]` VR Conversation Practice - Requires separate planning
*   `- [ ]` Community Content Marketplace - Requires separate planning
*   `- [ ]` Advanced Moderation & Anti-Cheat Measures
*   `- [ ]` Performance Optimizations (DB indexing, caching, WebRTC tuning)

*Self-Note: This README should be kept up-to-date as development progresses. Check off tasks as they are completed.*
