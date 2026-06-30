# 🏆 CommunityGuard: First-Prize Hackathon Submission & System Documentation

---

## 📌 1. Project Links & Metadata
* **Deployed Application URL:** [CommunityGuard Portal](https://communityguard-274926893039.asia-southeast1.run.app)
* **GitHub Repository Link:** [https://github.com/saitejadandu1231/communityguard](https://github.com/saitejadandu1231/communityguard)
* **Target Hackathon Track:** Civic Technology, Smart Cities, and Artificial Intelligence for Social Good

---

## 🔍 2. Problem Statement Selected
In rapidly growing urban areas, municipal administrations struggle with **inefficient civic complaint resolution, outdated tracking tools, slow response times, and an absence of citizen trust**. Traditional civic portals suffer from several core issues:
1. **Friction in Reporting:** Filing forms are long and confusing. Language barriers prevent non-English speakers from participating.
2. **Inaccurate Categorization & Assignment:** City staff spend thousands of hours manually reading, classifying, and routing complaints to appropriate departments (e.g., Water & Sewerage, Electricity, Road Maintenance).
3. **The Offline Gap:** Network blackouts or slow connections in dense or remote urban areas prevent real-time hazard reporting, losing critical safety data.
4. **No Real-Time Proximity Awareness:** Pedestrians and motorists are not alerted when they walk/drive directly toward a dangerous hazard (e.g., open drainage or a loose live power cable).
5. **No Engagement Incentives:** Citizen reporting feels like a black box with zero transparency, resulting in low community participation.

---

## 💡 3. Solution Overview: CommunityGuard
**CommunityGuard** is an offline-capable, AI-driven, full-stack Progressive Web Application (PWA) that acts as an intelligent operating system for smart cities. Built around the concept of **"Your Voice Fixes Your City,"** CommunityGuard empowers citizens to report issues effortlessly using AI, tracks resolution progress in real time, routes tickets automatically, and gamifies local engagement. 

By integrating **Gemini 2.5 Flash**, **Google Maps Platform**, **Cloud Firestore with local persistence caching**, and an Express/Node.js backend, CommunityGuard bridges the gap between passive reporting and proactive city stewardship.

### 🌐 System Architecture Schematic

```
                                  [ CITIZEN / OFFICER WEB CLIENT ]
                                                 │
                   ┌─────────────────────────────┴─────────────────────────────┐
                   ▼                                                           ▼
       [ NATIVE SERVICE WORKER (sw.js) ]                              [ LOCAL BROWSER STORAGE ]
        (Asset Caching & Offline Proxy)                                (offlineQueue & Auth Tokens)
                   │                                                           │
                   ├─────────────────────────────┬─────────────────────────────┘
                   ▼                             ▼
         Online? ──► [ YES ]                   [ NO ] ──► Queue Offline Transaction
                      │
                      ▼
         [ EXPRESS FULL-STACK PORTAL ] (server.ts)
         Bind: 0.0.0.0:3000 (Vite Middleware Proxy)
                      │
        ┌─────────────┼─────────────────────────────┐
        ▼             ▼                             ▼
 [ FIRESTORE SDK ] [ GEMINI SDK ]            [ SMTP NODEMAILER ]
 (Named Database)  (Vision, Audio, Chat)     (Ethereal / Real SMTP)
        │             │                             │
        ▼             ▼                             ▼
  Cloud Storage  AI proxy APIs                 Mail History
  Real-time Sync (/api/analyze-photo,           Auditing Log
  onSnapshot      /api/transcribe-audio,
  listeners       /api/safe-routing,
                  /api/agentic-audit)
```

---

## 🚀 4. Full Feature Walkthrough & Code-Level Details

CommunityGuard represents a fully realized civic ecosystem split into three distinct role experiences: **Citizens**, **Municipal Officers**, and **System Administrators**.

### 📱 A. Citizen-Facing Capabilities & Gamification

#### 1. Gemini Vision Photo Analyzer (Multimodal Audit)
* **How it works in code:** When a citizen uploads an image of a hazard, the frontend extracts the base64 string and POSTs it to `/api/analyze-photo`. The Express server proxies this payload to the `@google/genai` SDK using `gemini-2.5-flash`.
* **Prompt Engineering Safeguards:** The prompt instructs the model to detect if the photo actually depicts a municipal issue (pothole, water leak, etc.). If the user uploads a selfie, indoor food, or random meme, the model flags `"rejected": true` and populates `rejectionReason`.
* **Data Payload structure:**
  ```json
  {
    "rejected": false,
    "rejectionReason": "",
    "category": "pothole",
    "severity": "high",
    "confidence": 92,
    "requiredAction": "Seal pothole with hot asphalt mix immediately",
    "impactAssessment": "Affects major commuter traffic; high danger of vehicle rim and suspension damage",
    "recommendedAuthority": "Public Works Department (PWD)"
  }
  ```

#### 2. Gemini Audio Voice Transcriber (Hands-Free Reporting)
* **Hands-Free Accessibility:** Citizens can record audio directly in the browser via the MediaRecorder API. The audio data is captured as WebM, encoded in base64, and dispatched to `/api/transcribe-audio`.
* **Server-Side AI Transcription:** The backend instructs `gemini-2.5-flash` with a tailored transcription directive, outputting raw text transcripts. This automatically populates the text description field, allowing hands-free reporting on the move.

#### 3. Regional Language Support & Custom Localization Context
* **Custom Context Engine (`LanguageContext.tsx`):** A custom lightweight React provider maps all text strings through an internationalization (i18n) helper.
* **Supported Languages:** Comprehensive, seamless localized dictionary mappings for **English**, **Hindi (हिंदी)**, **Telugu (తెలుగు)**, **Tamil (தமிழ்)**, **Kannada (ಕನ್ನಡ)**, and **Bengali (বাংলা)**.
* **Reactive Translation:** Seamlessly translates the navigation rails, buttons, quest logs, alerts banners, and headers instantly without page reloads.

#### 4. Pedestrian Safe Navigation Engine (Hazard Avoidance Route Planning)
* **Monsoon Routing Algorithm:** Standard map routing connects coordinate A to B in a straight line. CommunityGuard's safe routing agent (`/api/safe-routing`) acts as a "Civic Hydro-Engineer."
* **Intersectional Bypassing:** The server-side agent evaluates the geographical coordinate bounding box of the route. If an active, unresolved high-severity hazard (e.g. electrical wire spark, flooding waterlog) exists near the path, it calculates detours and returns safe alternate intermediate coordinate nodes.
* **Step-by-step Instructions:** Generates sequential route navigation steps and detailed warnings, keeping pedestrians and cyclists safe from hidden urban hazards.

#### 5. Gamified XP System, Quests, & Digital Wallet
* **Civic Engagement Incentives:**
  * Reporting a new validated hazard: **+50 XP**
  * Upvoting/verifying an existing local issue: **+5 XP**
  * Submitting action logs or comment verifications: **+15 XP**
* **Active Civic Quests:** Features interactive neighborhood quests like *"Report 2 Sanitation Hazards"* or *"Upvote and verify 3 local issues"*. 
* **Claims Ledger:** Claiming quests adds points directly to the user's persistent digital profile in Firestore and tracks claim status via `userProfile.claimedQuests` to prevent double-claiming.

#### 6. XP Rewards Store (Local Redemption)
* **Tangible Municipal Vouchers:** Users spend accrued XP to unlock vouchers sponsored by local merchant cooperatives and transit authorities:
  * **1-Day Municipal Metro Pass** (120 XP)
  * **Urban Green Garden Kit** (180 XP)
  * **Public Pool Entrance Pass** (80 XP)
  * **Neighborhood Coffee Coupon** (60 XP)
  * **Municipal Parking 2hr Voucher** (100 XP)
* **Voucher Security:** Deducts XP in Firestore, generates a unique secure serial hash voucher code, and appends the voucher with `status: 'active'` to `userProfile.claimedVouchers`.

#### 7. Crowdsourced Verification (Upvote & Downvote Ledger)
* **Community Consensus Routing:** Users can upvote valid local issues to verify their existence and boost their priority score, or downvote spam reports.
* **Consensus Thresholds:** Once an issue accumulates negative votes, it is marked as `isPendingConsensus: true` or automatically rejected, preventing spam or falsified issues from taking up municipal response time.

---

### 👮 B. Officer-Facing Capabilities & Real-Time Response

#### 1. Department-Tailored Ticket Queue
* **Role-Based Isolation:** When on-ground officers log in, they are immediately directed to the `/officer` dashboard.
* **Targeted Operations:** The queue filters and prioritizes unresolved incidents that strictly match the officer's designated department (e.g., Roads & Potholes, Water & Sewerage, Electrical Maintenance).

#### 2. Standard Municipal Protocol (SMP) Guidelines
* **On-Site Safety Compliance:** Integrates interactive, multi-volume SOP manual frames directly into the officer's screen.
* **Category-Specific Guidance:** Selecting a ticket dynamically fetches the corresponding SOP guidelines (e.g., proper PPE for electrical repair, aggregate ratios for pothole patching), ensuring strict municipal compliance.

#### 3. Action Logs & Visual Completion Proof
* **Pristine Audit Trail:** Officers can transition ticket states (`reported` -> `assigned` -> `in_progress` -> `resolved`).
* **Completion Logs:** To resolve an incident, officers must provide a detailed explanation of the fix and upload a photograph proving resolution. This updates the issue's `resolvedPhotoUrl` and adds an entry to the transaction audit history log.

---

### 🛡️ C. Administrator & System Control Capabilities

#### 1. System-Wide Parameters Configurator
* **Dynamic Control Board:** Administrators can adjust operational configurations in real time, saving changes directly to Firestore (`system_config/parameters`):
  * **Escalation Upvote Threshold:** The number of upvotes required to escalate a ticket's SLA category.
  * **SLA Completion Target Times (Hours):** Expected response times per department.
  * **XP Multipliers:** Set holiday or crisis event multipliers (e.g., Double XP for monsoon cleanups).
  * **GuardBot Assistant Persona:** Instantly calibrate the AI chatbot's personality (*Empathetic Civil Servant*, *Strict Direct Coordinator*, or *Crisis Management Advisor*).

#### 2. Live Audit Trail & Diagnostic Logs
* **Real-Time Operational Monitoring:** Streams server-side events, Firestore operations, API requests, and Gemini transaction performance metrics directly onto the admin console.

#### 3. SMS & Email Notification Ledger
* **Communication Auditing:** Tracks every alert, automated email dispatch, and SMS broadcast issued by CommunityGuard. This includes recipient name, phone/email, channel, message, delivery status, and timestamp, guaranteeing 100% notification auditing.

#### 4. Officer Crew Registration Gateway
* **Workforce Deployment:** Secure gateway to enroll on-ground responders, assign them to corresponding municipal wings, and record their active municipal GPS coordinates for nearby dispatches.

---

### 🌐 D. Core Ecosystem Features (Universal & Offline)

#### 1. Real-Time GIS Map & Heatmap Visualizer
* **Spatial Plotting:** Renders active hazard coordinates using custom colored markers (red for critical, amber for medium, green for low) categorized by municipal wings.
* **Urban Heatmap overlay:** Integrated D3 spatial clustering engine translates high-density report zones into visual warm spots to assist city planners in prioritizing budget and infrastructure repairs.

#### 2. Geofencing Proximity Alarm Simulator
* **Real-time Spatial Tracking:** A background service computes the Haversine distance between the user's current coordinates (simulated on the map) and active, unresolved hazards.
* **Proximity Alert Overlay:** Walking or driving within 500 meters of a hazard triggers a beautiful, high-contrast overlay modal accompanied by a warning buzzer, cautioning the user to stay alert.

#### 3. Robust Service Worker (`sw.js`) & Offline Sync
* **Asset Caching:** Native Stale-While-Revalidate caching pattern caches critical files (`index.html`, compiled `.js`, and global `.css` styles), preventing white-screen crashes on page refreshes during network blackout.
* **Command Deck Simulation Terminal:** Contains an interactive Command Deck to simulate network disconnections.
* **Queue Persistence:** When offline, any citizen reporting, upvoting, or commenting is captured, intercepted, and queued inside local storage (`offlineQueue`).
* **Automatic Background Synchronization:** Once the network status returns to `online`, a background listener automatically flushes the queue, uploading records to Cloud Firestore.

#### 4. Auto-Agent Assignment & Spatial Dispatch (Agentic Auditing)
* **Automated Audit Routine:** Immediately upon hazard creation, the Express server executes `/api/agentic-audit`.
* **Proximity Allocation:** It evaluates nearby registered on-ground officers, computes their Haversine distances to the incident, assesses current workloads, and automatically assigns the ticket to the nearest qualified officer.
* **Automated SMS Dispatch:** Automatically broadcasts SMS notifications to the citizen (confirming dispatch) and the officer (details of the emergency).

#### 5. GuardBot AI (Municipal Smart Assistant)
* **Context-Aware Floating Assistant:** Floating chat helper available on every page.
* **Live Ledger Context:** Upon invocation, the server-side proxy fetches the latest 15 issues from the Firestore database, active system alerts, and SLA guidelines, feeding them directly into the Gemini model context. GuardBot knows exactly what is happening in the city, who is assigned, and how many upvotes have been registered.

---

## 🛠️ 5. Technologies Used

* **Frontend Framework:** React 18+, Vite, TypeScript, Framer Motion (for elegant fluid visual page state transitions and micro-animations).
* **Styling Engine:** Tailwind CSS, Lucide Icons (for unified iconography).
* **Database & Auth:** Cloud Firestore (utilizing `persistentLocalCache` and `persistentMultipleTabManager` for zero-latency client reading) paired with Google Sign-In & Demo Account ledgers.
* **Backend Runtime:** Node.js, Express, `tsx` (for direct typescript runtime in dev), compiled and optimized with `esbuild` to standard CommonJS `dist/server.cjs` for performance.
* **Notification Engines:** Nodemailer (SMTP/Ethereal testing SMTP) and real-time Twilio and Push-notifications payload logging.

---

## 🌟 6. Google Technologies Utilized (The Winning Edge)

1. **🔥 Cloud Firestore (Durable Cloud Persistence):**
   Acts as the central system of record. Uses Firebase's modern SDK with persistent cache configurations:
   * Enables zero-latency reads for cached issues.
   * Leverages `onSnapshot` real-time listeners for instant sync of active incidents across citizen, officer, and admin views.
   * Guarantees smooth, crash-free operation even when refreshing the browser during offline simulation.
2. **🤖 Gemini 2.5 Flash SDK (`@google/genai`):**
   * **Gemini Vision:** Automates classification, department triage, and severity assessment from uploaded photographs.
   * **Gemini Audio:** Transcribes recorded voice messages into actionable incident texts.
   * **GuardBot Assistant:** Answers citizen queries with live Firestore database context.
3. **🗺️ Google Maps Platform:**
   Renders custom GIS portals, routes detours, and visually highlights active hazard heatmaps.
4. **☁️ Google Cloud Run:**
   Hosts the full-stack container on a scalable, high-performance infrastructure.

---

## 📈 7. Steps to Recreate and Deploy to Google Cloud

### Step 1: Clone and Install Dependencies
```bash
git clone https://github.com/saitejadandu1231/communityguard.git
cd communityguard
npm install
```

### Step 2: Configure Environment Variables
Create a `.env` file in the project root:
```env
# Gemini API Key
GEMINI_API_KEY=your_gemini_api_key_here

# Firebase Configuration
FIREBASE_PROJECT_ID=ai-studio-6bbdfdd6-2434-42d0-b8c7-cabfc91f670a
```

### Step 3: Local Development
```bash
# Launches Express on Port 3000 with Vite middleware proxy
npm run dev
```

### Step 4: Production Compilation & Bundling
```bash
# Compiles frontend assets and bundles server.ts into dist/server.cjs
npm run build
```

### Step 5: Containerize and Deploy to Google Cloud Run
Compile and host the application using Cloud Build and Cloud Run:
```bash
# Build the container image in the cloud
gcloud builds submit --tag gcr.io/your-project-id/communityguard

# Deploy to Cloud Run, binding to Port 3000
gcloud run deploy communityguard \
  --image gcr.io/your-project-id/communityguard \
  --platform managed \
  --region asia-southeast1 \
  --allow-unauthenticated \
  --port 3000 \
  --set-env-vars GEMINI_API_KEY=your_gemini_api_key_here
```

---

## 🧭 8. Step-by-Step User Journey & Walkthrough Flows (Role-by-Role)

To help hackathon judges, contest reviewers, and smart-city coordinators fully evaluate the scope of CommunityGuard, this guide provides a step-by-step walkthrough of every user journey.

---

### 👤 Flow A: The Citizen Journey (Community Stewardship)

The citizen is the heart of CommunityGuard, empowered with tools to log hazards, participate in neighborhood governance, and earn dynamic rewards.

#### Step 1: Portal Access & Quick Authentication
1. **Landing:** When the judge opens the application URL, they are greeted by the clean, responsive landing dashboard.
2. **One-Click Demo Authentication:** Under the profile avatar or login modal, click **"Use Demo Citizen Account"** (or use Google Sign-In). 
3. **Local Storage Loading:** The custom Service Worker reads local cache presets, updating the client profile instantly without a loading flicker.
4. **Localization Calibration:** Tap the language selector in the top bar. Choose **Hindi (हिंदी)** or **Telugu (తెలుగు)**. Watch the entire interface—nav rails, maps widgets, titles, quests—translate dynamically. Switch back to **English** for the rest of the flow.

#### Step 2: Reporting an Incident with Gemini Multi-Modal AI
1. **Initiation:** Click **"Report New Hazard"** on the main navigation rail.
2. **Visual Multimodal Analysis (Gemini Vision):**
   * Click **"Upload Image/Take Photo"**. Choose a photo of a hazard (e.g., a pothole or flooding).
   * The server executes a request to `gemini-2.5-flash` with raw image buffers.
   * **Visual Verification:** Gemini instantly returns structured JSON. Watch the UI auto-populate the *Issue Title*, *Description*, and *Category (Roads, Water, Electrical, etc.)*, and assign a calculated *Severity Level* (1–10).
   * *Anti-Abuse Check:* Try uploading an unrelated photo (e.g. food or a landscape). Watch the AI reject the input with a friendly warning explaining why it's not a municipal issue.
3. **Eyes-Free Reporting (Gemini Audio):**
   * If on a bicycle or walking, click **"Record Voice Note"**.
   * Speak into the microphone: *"There is a broken streetlight sparking here on Main Street."*
   * Click stop. The audio stream is compiled and sent to `/api/transcribe-audio`. Gemini transcribes the audio, auto-filling the descriptive incident field.
4. **GPS Geolocation & Submission:**
   * The map automatically pinpoints the citizen's current simulated coordinates.
   * Click **"Submit Hazard Report"**.
   * **Real-time Synchronization:** The system creates a live record in Cloud Firestore. A success notification slides in, and the new incident pin is rendered on the interactive GIS portal.

#### Step 3: Pedestrian Safe Navigation & Monsoon Detours
1. **Interactive Routing:** Open the **"Safe Paths Map"** tab.
2. **Routing Coordinates:** Input a target destination (e.g., from *Ward 4 Community Center* to *East District Gate*).
3. **Live Avoidance Calculation:** The pedestrian navigation engine pulls active, high-severity hazard polygons from the database.
4. **Adaptive Detours:** Instead of plotting a direct line through a dangerous flooded street or sparking cable, the map displays a blue detour route. Click on individual route steps to read safety guidelines (e.g., *"Detour recommended: Sparking High-Voltage Cable detected 150m ahead"*).

#### Step 4: The Gamified XP Engine & Digital Rewards Wallet
1. **Quest Exploration:** Scroll down to the **"My Civic Quests"** card on the main dashboard.
2. **Active Goals:** View quests like *"Sanitation Auditor"* (file 2 trash issues) or *"Neighborhood Inspector"* (upvote 3 active complaints).
3. **Claiming Progress:** When you file a report, watch the progress counter increment. Once complete, click **"Claim XP"**.
4. **Wallet Accumulation:** Watch your XP progress circle animate as points are credited to your persistent profile.
5. **Redeeming Merchant Vouchers:**
   * Click on the **"XP Rewards Store"** drawer.
   * Browse available vouchers (e.g., *Metro Smart Pass* for 120 XP or *Neighborhood Coffee* for 60 XP).
   * Click **"Redeem Voucher"**. Your digital wallet balance is updated, and a high-contrast modal displays your secure, unique voucher serial number and QR code for local validation.

#### Step 5: Crowdsourced Verification (Upvote & Downvote Ledger)
1. **Citizen Collaboration:** Open the **"Active Alerts List"**.
2. **Upvote Escalation:** Tap the upvote icon on a nearby issue reported by a neighbor. Each upvote increases the issue's priority score. If it crosses the Admin-configured *Escalation Upvote Threshold*, its municipal SLA status upgrades to *Critical Dispatch*.
3. **Downvote Moderation:** If a user spots a false report, they can downvote it. If downvotes exceed upvotes, the issue is flagged for Admin moderation, keeping the system clean and spam-free.

#### Step 6: GuardBot AI Floating Assistant
1. **Activation:** Tap the floating round chat bubble in the bottom right corner of the viewport.
2. **Database-Aware Inquiries:** Ask GuardBot: *"What are the active issues in my ward?"* or *"Who is working on the sparking wire near the center?"*
3. **Context Injection:** GuardBot fetches active Firestore tickets and department records, responding with real-time status updates (e.g., *"Hello! Officer Sarah is currently dispatched to the waterlogged sewer on Main Street. The ticket has 5 community upvotes and is expected to be fixed within 2 hours."*).

#### Step 7: Simulated Offline Reporting (Network Resilience Demo)
1. **Disconnecting:** On the bottom control deck, click **"Go Offline (Simulate Blackout)"**. A red **"Offline Mode Active"** banner appears.
2. **Offline Interception:** Fill out a hazard report or upvote an issue.
3. **Local Queuing:** Since there is no internet, the local Service Worker intercepts the request, storing it inside the browser's persistent `offlineQueue`. The UI displays a toast: *"Stored offline. We will sync as soon as you are back online."*
4. **Reconnecting:** Click **"Reconnect (Go Online)"** on the control deck.
5. **Dynamic Synchronization:** The background listener fires immediately, processing the queue and synchronizing the records with Cloud Firestore. The offline banner disappears, and the pins show up on the map for all users.

---

### 👮 Flow B: The Municipal Officer Journey (Ground Operations)

The officer interface is built for speed, safety, and operational clarity.

#### Step 1: Role Login
1. **Accessing the Console:** From the main dashboard, select **"Login as Municipal Responder"** (or toggle your role using the quick-swap profile switcher).
2. **Department Assignment:** Log in as **Officer Marcus** (assigned to *Roads & Infrastructure*) or **Officer Sarah** (assigned to *Electrical & Power Maintenance*).

#### Step 2: Tailored Task Allocation
1. **Isolated Department View:** The officer is immediately presented with a focused queue. Marcus does not see plumbing issues; he only sees potholes, broken pavements, and structural hazards.
2. **Dynamic Workload Cards:** Tickets are sorted automatically based on their *Gemini-Calculated Severity Index* and *Community Upvote Consensus*.

#### Step 3: SMP Compliance (On-Site Guidelines)
1. **Safety First:** Select an active ticket from the queue.
2. **Standard Municipal Protocols:** The sidebar slides open, displaying the relevant section of the municipal SOP handbook (e.g., *Volume 2, Section 4: Hot Asphalt Aggregates and Protective Wear Guidelines*).
3. **Audit Readiness:** This ensures field responders adhere to safety and material compliance on every fix.

#### Step 4: Dispatch, Status Tracking & Resolution Proof
1. **Status Update:** Tap **"Dispatch to Location"** to mark the ticket as *In Progress*. This triggers real-time updates for the citizen who reported it.
2. **Resolving the Hazard:** Once fixed, click **"Submit Resolution"**.
3. **Visual Audit Verification:**
   * Enter comments describing the fix (e.g., *"Completed aggregate fill and rolled hot asphalt over the 2-meter pothole. Tested load bearing."*).
   * Upload an image of the resolved site.
   * Click **"Complete Ticket"**. The system updates Firestore, moves the hazard pin to the **"Resolved Showcase"** gallery, and distributes bonus XP to the citizen who originally reported the hazard.

---

### 🛡️ Flow C: The System Administrator Journey (City Command Center)

The central command dashboard gives city administrators complete control over parameters, personnel, and communications.

#### Step 1: Admin Console Access
1. **Login:** Swap your role to **"System Administrator"**.
2. **Dashboard Overview:** View city-wide statistics, active tickets across departments, officer distribution grids, and server resource health.

#### Step 2: Live Parameters Configurator
1. **Adjusting Rules on the Fly:**
   * **Upvote Threshold:** Lower the escalation upvote threshold from 10 to 3. Watch how issues in the queue immediately escalate in priority when upvoted by citizens.
   * **SLA Targets:** Change the target completion time for the *Water & Sewerage* department from 12 hours to 6 hours.
   * **XP Multipliers:** Set a 2.0x modifier for weekend cleanup campaigns.
2. **GuardBot Tone Tuning:** Swap GuardBot's personality from *Empathetic Civil Servant* to *Crisis Management Coordinator*. Ask GuardBot a question and observe the tone shift instantly.

#### Step 3: Live Audit Trail & Notification Ledgers
1. **System Logging:** Scroll down to the **"Live Diagnostic Audit"** log.
2. **Tracking Actions:** Submit a report in another window or tap an upvote. Watch the API logs stream in real time, recording operations like *Firestore Write, Gemini API Call, and Router Compute*.
3. **SMTP Notification Ledger:** Open the **"Notification Ledger"** to view simulated emails and SMS dispatches. Inspect delivery receipts verifying alerts sent to citizens and officers.

#### Step 4: Emergency Ward Broadcasts
1. **Urgent Bulletins:**
   * Enter a high-priority message: *"Heavy monsoon downpour expected tonight. Avoid Ward 12 low-lying roads."*
   * Select **Ward 12** as the target.
   * Click **"Broadcast Emergency Alert"**.
   * **Instant Alerts:** This instantly pushes the warning to the alert ribbons of all citizens subscribed to Ward 12.

---

*This document serves as the official design, architectural, and user-experience workbook for CommunityGuard. It is formatted for direct presentation to municipal authorities, technical evaluators, and smart-city planners.*
