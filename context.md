# 🎮 Discord Multiplayer Narrative Game Engine

### Anime-Inspired, Role-Driven, Choice-Based Storytelling

---

## 1. Project Overview

This project is a **multiplayer narrative game engine built entirely on Discord**, designed to deliver **anime-inspired interactive stories** that players experience together.

The game blends:

- **Single-player (SP) narrative progression**
- **Multiplayer (MP) cooperative storytelling**
- **Role-based gameplay**
- **Persistent progression**
- **Cards and abilities unlocked through story outcomes**

This is **not a traditional Discord bot game**.
It is a **shared narrative engine** where Discord is used as the storytelling medium.

---

## 2. Core Vision

> _“Play an anime episode with your friends, where every decision matters.”_

Players:

- Make meaningful choices
- Receive private and public information
- Face pressure, danger, and social consequences
- Carry long-term effects from solo play into multiplayer sessions

The system is designed to support **multiple stories**, **multiple universes**, and **long-running campaigns**.

---

## 3. Discord UX Rules (Hard Constraints)

The entire experience must be delivered using only:

- **Public message + embed** → shared story state
- **Buttons** → fast decisions
- **Select menus** → complex or ordered choices
- **Ephemeral responses** → private confirmations or hints
- **DMs** → private story delivery when secrecy is critical
- **Message edits** → evolve scenes
- **Message deletes** → keep chat readable

> ❗ No external UI during gameplay.
> ❗ One main story embed at a time.

---

## 4. Architecture

### 4.1 Split Architecture: Bot & Server

The system is divided into two distinct services:

1.  **Discord Bot (`bot/`)**

    - **Role:** Frontend / UI Layer
    - **Responsibility:** Renders embeds, handles Discord interactions (buttons, commands), and communicates with the User.
    - **Logic:** Minimal. Relies on the backend for all game state and logic.
    - **Tech:** TypeScript, Discord.js, Bun.

2.  **Backend Server (`server/`)**
    - **Role:** Game Engine & Source of Truth
    - **Responsibility:**
      - Manages **User Profiles** and **Parties** via PostgreSQL (Prisma).
      - Stores and serves **Story Content** (JSON graphs).
      - Calculates **Roles** and **Outcomes**.
      - Persists **Story State** (UserProgress) and **Minigame State**.
    - **Tech:** TypeScript, Express, Prisma, Bun, PostgreSQL.

### 4.2 The Engine Flow

1.  **Bot** receives user input (e.g., choice button click).
2.  **Bot** sends input to **Server** API.
3.  **Server** updates state, calculates outcome, and returns the next node data.
4.  **Bot** renders the new node as a Discord Embed.

This separation ensures:

- **Security:** Game logic is hidden from the client.
- **Persistence:** Progress is saved reliably in a database.
- **Scalability:** The backend can support multiple bot shards or other frontends.

---

## 5. Single-Player Mode (SP)

### 5.1 Purpose of SP

Single-player mode exists to:

- Introduce the world
- Teach narrative mechanics
- Shape the player’s personality
- Assign a **role** based on behavior
- Unlock **cards** and long-term progression

SP is **canon**. Its outcomes matter later.

---

## 6. Prologue Story & Role Assignment

### 6.1 Prologue Mini-Story

Every new player begins with a **short, self-contained prologue story**.

This prologue:

- Is fully playable solo
- Contains multiple meaningful choices
- Tests behavior under pressure, empathy, logic, risk, and leadership

Examples of tracked behavior:

- Did the player act decisively or cautiously?
- Did they prioritize others or themselves?
- Did they observe or rush in?
- Did they rely on logic, emotion, or authority?

---

### 6.2 Role Determination

At the end of the prologue, the system assigns **one primary role** based on accumulated signals.

Example roles:

- Leader
- Scout
- Fighter
- Strategist
- Support

This assignment:

- Is **not chosen manually**
- Is **earned through narrative behavior**
- Becomes part of the player’s persistent identity

---

### 6.3 Role Permanence & Growth

- Roles are persistent across stories
- Roles may evolve later
- Some cards or actions may be role-locked
- Party composition matters in multiplayer

---

## 7. Cards & Progression System

### 7.1 Cards (Narrative Abilities)

Cards represent:

- learned skills
- narrative advantages
- situational abilities
- character growth

Cards are earned through:

- SP story completion
- Special narrative outcomes
- Major decisions or sacrifices

---

### 7.2 Using Cards in Multiplayer

In MP sessions:

- Cards may unlock **special choices**
- Cards may influence outcomes subtly
- Cards never guarantee success — they improve odds

Cards:

- Are optional
- Are context-sensitive
- Never replace narrative decision-making

---

## 8. Multiplayer Mode (MP)

### 8.1 Party & Team System

Multiplayer revolves around **temporary teams**.

Core commands:

- `/team` → view current team
- `/invite` → invite players
- `/leave` → leave a team
- `/start` → begin a story session

Teams:

- Are session-scoped
- Have shared state
- Can split temporarily during scenes

---

### 8.2 Party Composition Matters

The system checks:

- Which roles are present
- Which cards are available
- How many players are active

Some scenes:

- Become easier with certain roles
- Unlock special options if roles are present
- Become harder if the team lacks balance

---

## 9. Gameplay Systems (Unified)

### 9.1 Choice-Based Narrative

- Button and select-based decisions
- Hidden or delayed consequences
- No explicit “right” answers

Choices represent **intent**, not guaranteed success.

---

### 9.2 Timed Decisions

- Countdown-based pressure
- Solo or group voting
- Silence is meaningful
- Default outcomes trigger on timeout

Used to simulate urgency, fear, and chaos.

---

### 9.3 Private Information & Secrecy

Some players may receive:

- Hidden observations
- Private clues
- Conflicting information

This creates:

- Information asymmetry
- Role-driven conversation
- Emergent trust or suspicion

---

### 9.4 Contextual Memory Gameplay

Memory is **environmental**, not abstract.

Example:

- Earlier scene describes a room
- Later scene requires recalling a useful detail
- Attentive players gain an advantage

The game never announces this as a “memory test”.

---

### 9.5 Planning & Order Puzzles

Players may need to:

- Plan steps
- Assign order
- Coordinate actions

Handled through:

- Select menus
- Confirmation buttons
- Group agreement

---

### 9.6 Combat-Like Encounters (Narrative Combat)

Combat is **danger resolution**, not number crunching.

Key principles:

- Threat levels instead of HP
- Tasks instead of turns
- Synergy between actions
- Partial success and failure

Defeat redirects the story — it never hard-ends it.

---

### 9.7 Social Pressure & Group Splits

Some scenes allow:

- Splitting objectives
- Parallel actions
- Diverging paths

The system later recombines outcomes into the main narrative.

---

### 9.8 Slice-of-Life & Emotional Scenes

Not all scenes are dangerous.

The system supports:

- Emotional dialogue
- Relationship building
- Awkward moments
- Quiet character beats

No failure states — only narrative direction.

---

## 10. Roles & Role-Based Actions

### 10.1 Role-Reserved Actions

Some scenes include **special high-impact actions**.

Design rules:

- Visible to everyone
- Exists only if the party has the role
- Anyone may click
- Represents team capability, not authority

This reinforces:

- Party composition
- Strategic team building
- Replayability

---

## 11. Outcome Resolution System

### 11.1 What Outcomes Do

Outcomes determine:

- What actually happens
- How reality resolves
- Which node comes next

They run:

- After all inputs are collected
- Or when timers expire

---

### 11.2 Why Outcomes Are Separate

Because:

- Multiple players act simultaneously
- Silence matters
- Secret actions exist
- Partial success is common
- Cards and roles may intervene

Outcomes are **engine logic**, not story text.

---

## 12. Side Effects on Scene Entry

Side effects are **automatic consequences** of entering a scene.

They:

- Run immediately
- Do not depend on player input
- Always happen

Examples:

- Deliver private info
- Start background timers
- Apply environmental stress
- Set hidden flags

Side effects **set the stage**.

---

## 13. Long-Term Persistence

The system tracks:

- Roles
- Cards
- Flags
- Relationships
- Reputation
- Major decisions

Rules:

- Never expose raw numbers
- Always surface change via narrative
- Old choices quietly shape future scenes

---

## 14. Scalability & Story Authoring

### 14.1 Many Nodes Are Expected

Stories will have:

- Hundreds of small nodes
- Tight focus per scene
- Clear transitions

This improves:

- Pacing
- Maintainability
- Live updates
- Collaboration

---

### 14.2 Node Versioning

Nodes are versioned to:

- Protect live sessions
- Allow rebalancing
- Enable safe dialogue edits

Players never see versions — only stability.

---

## 15. Final Mental Model (For the Developer)

> This is not a command-driven bot.
>
> This is a **state-driven narrative engine**, where Discord is the rendering layer.

If implemented correctly:

- Content becomes easy to add
- Stories become reusable
- Multiplayer stays deterministic
- Immersion remains high

---

## 16. What This System Ultimately Enables

- Anime story knockoffs
- Original universes
- One-shot adventures
- Episodic campaigns
- Role-driven multiplayer storytelling
- Long-term character progression
- Emergent narrative moments

All **inside Discord**.

---
