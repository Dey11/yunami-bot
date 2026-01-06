# 🦅 Yunami - Project Walkthrough & Developer Guide

Welcome to the **Yunami** codebase. This document serves as the primary guide for understanding how the Yunami Discord multiplayer narrative engine works, how the code is structured, and the flow of data from a user's click to the database and back.

---

## 🏗️ System Architecture

Yunami uses a **split architecture** consisting of two main services that communicate via a REST API:

### 1. The Bot (`bot/`) - _The "Frontend"_

- **Role**: User Interface & Input Handler.
- **Stack**: TypeScript, Discord.js, Bun.
- **Responsibilities**:
  - Listening for Discord commands and button interactions.
  - Sending requests to the backend server.
  - Rendering responses (Embeds, Images) based on data received from the backend.
  - It contains **minimal logic** — it mainly acts as a display layer.

### 2. The Server (`server/`) - _The "Backend"_

- **Role**: Game Engine, Database & Logic Core.
- **Stack**: TypeScript, Express, Prisma (PostgreSQL), Bun.
- **Responsibilities**:
  - **User Management**: Authentication (via Discord ID), Profiles.
  - **Story Engine**: Loading story graphs (JSON), managing state (current node, flags).
  - **Party System**: Creating parties, managing members, ready checks.
  - **Game Logic**: Calculating roles, resolving choices, persisting minigame states.

### 🔄 The Connection

The Bot communicates with the Server via HTTP requests.

- Every request includes the `x-discord-id` header to identify the user.
- The generic flow is: `User Action` → `Bot Handler` → `API Request` → `Server Logic` → `Database Update` → `JSON Response` → `Bot Render`.

---

## 📂 Directory Structure & Key Files

### `/server` (The Brain)

| Path                       | Description                                                                                                                                                            |
| :------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`prisma/schema.prisma`** | **Database Models.** Defines `User`, `UserProgress` (story state), `Party`, `PartyMember`, and `MinigameState`. This is the single source of truth for data structure. |
| **`src/index.ts`**         | Entry point. Sets up the Express app and mounts routes.                                                                                                                |
| **`src/routes/`**          | API Endpoints definitions.                                                                                                                                             |
| ├── `auth.routes.ts`       | Handles user registration (`POST /auth/register`).                                                                                                                     |
| ├── `prologue.routes.ts`   | Logic for starting/completing the prologue and **calculating roles**.                                                                                                  |
| ├── `stories.routes.ts`    | Serves story content (`GET /stories`).                                                                                                                                 |
| ├── `story.routes.ts`      | Managing active story sessions (`POST /story/choice`).                                                                                                                 |
| ├── `party.routes.ts`      | Multiplayer lobby logic (`create`, `join`, `ready`).                                                                                                                   |
| └── `minigame.routes.ts`   | Persistence for combat/puzzle states.                                                                                                                                  |
| **`src/services/`**        | Business logic layer.                                                                                                                                                  |
| ├── `story.service.ts`     | **Story Loader.** Reads JSON files from `stories/` directory.                                                                                                          |
| ├── `role.service.ts`      | **Role Calculator.** Algorithms to determine user role from choices.                                                                                                   |
| ├── `progress.service.ts`  | CRUD for user story progress.                                                                                                                                          |
| └── `minigame.service.ts`  | CRUD for minigame states.                                                                                                                                              |
| **`stories/`**             | **Content.** Contains the JSON files (e.g., `prologue.json`) that define the story nodes, text, and choices.                                                           |

### `/bot` (The Face)

| Path                           | Description                                                                                                            |
| :----------------------------- | :--------------------------------------------------------------------------------------------------------------------- |
| **`src/index.ts`**             | Entry point. Logs into Discord and loads handlers.                                                                     |
| **`src/api/client.ts`**        | **API Wrapper.** Validates inputs and fetches data from the backend. **All communication goes through here.**          |
| **`src/buttonhandlers/`**      | Logic for when users click buttons.                                                                                    |
| ├── `create-profile.ts`        | Handles "Start Game". Calls API to register & start prologue.                                                          |
| ├── `start-story.ts`           | Handles "Start Story". Fetches story data and renders the first node.                                                  |
| ├── `engine-choice-handler.ts` | **Core Mechanic.** Handles narrative choices. Sends choice to backend, checks if story ended, trigger role assignment. |
| └── `party-ready.ts`           | Lobby interactions (Ready/Unready).                                                                                    |
| **`src/commands/`**            | Slash commands (not heavily used in narrative flow, mostly for debug/lobby).                                           |

---

## 🎮 End-to-End Game Flow

### 1. New User Registration

1.  **User** interacts with the bot (e.g., clicks "Start Journey").
2.  **Bot** (`create-profile.ts`) calls `api.register()` and `api.startPrologue()`.
3.  **Server** creates a `User` record and a `UserProgress` record for the prologue.
4.  **Bot** receives the first node of the prologue and renders it.

### 2. Playing the Prologue (Solo)

1.  **Bot** displays a Story Embed with Choices (Buttons).
2.  **User** clicks a choice (e.g., "Inspect Portal").
3.  **Bot** (`engine-choice-handler.ts`) calls `api.submitChoice()`.
4.  **Server** updates `UserProgress.state` (recording the choice).
5.  **Bot** receives the _next node_ and renders it (editing the message).

### 3. Role Assignment (The Climax of Prologue)

1.  **User** reaches the final node of the prologue.
2.  **User** clicks the final button.
3.  **Bot** detects `nextNodeId: null`.
4.  **Bot** automatically calls `api.completePrologue()`.
5.  **Server** (`role.service.ts`) analyzes all choices made.
    - _Example: Did they pick "Attack" often? -> Fighter._
6.  **Server** assigns the role to the `User` model and returns it.
7.  **Bot** displays the **"Prologue Complete"** embed revealing their new Role.

### 4. Multiplayer Party

1.  **User** runs `/party create`.
2.  **Bot** calls `api.createParty()`.
3.  **Server** creates a `Party` and returns a **Code** (e.g., `ABC12`).
4.  **User** shares code with friends.
5.  **Friend** runs `/party join ABC12`.
6.  **Server** adds them to `PartyMember` and links them.
7.  **Lobby UI** updates to show members and "Ready" status.

### 5. Starting a Multiplayer Story

1.  **Leader** clicks "Start Story" in the lobby.
2.  **Bot** calls `api.startStory()`.
3.  **Server** initializes `UserProgress` for **all** party members, synced to the same story.
4.  **Bot** renders the opening scene for everyone simultaneously.

---

## 🛠️ Developer Instructions

### Prerequisites

- [Bun](https://bun.sh) (v1.0+)
- Docker (for local Postgres) OR a remote Postgres URL.

### Setting Up Environment

**1. Database**
You need a PostgreSQL instance.

```env
# server/.env
DATABASE_URL="postgresql://user:password@localhost:5432/yunami?schema=public"
```

**2. Backend**

```bash
cd server
bun install
bun run db:push   # Pushes schema.prisma to your DB
bun run dev       # Starts server at http://localhost:3000
```

**3. Bot**

```bash
cd bot
bun install
# bot/.env
DISCORD_TOKEN="your_token"
API_BASE_URL="http://localhost:3000"
bun run src/index.ts
```

### Adding a New Story

1.  Create a JSON file in `server/stories/` (e.g., `chapter1.json`).
2.  Define nodes and choices.
3.  Restart server (it loads stories on startup).
4.  Users can now load it via ID.

---

> **Note:** The "Bot" side is designed to be **stateless**. If the bot crashes/restarts, no game data is lost because everything lives in the `Server`'s database. Users simply click "Continue" or re-run a command to resume exactly where they left off.
