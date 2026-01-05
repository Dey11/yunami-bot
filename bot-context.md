# Bot Context

## Implemented Features

### Narrative Engine (`bot/src/engine`)

- **Outcome Engine**: Handles resolution of story nodes (`outcome-engine.ts`).
- **Dispatcher**: Likely manages event dispatching (`dispatcher.ts`).
- **Preconditions**: Logic to check if choices/nodes are available (`preconditions.ts`).
- **Side Effects**: Handles side effects of nodes (`side-effects.ts`).
- **Timer Management**: Handles time-based constraints in the story (`timer-manager.ts`).
- **Vote Status**: Likely handles voting logic for multiplayer choices (`vote-status.ts`).

### Story Content (`bot/src/stories`)

- Data-driven stories in JSON format (e.g., `prologue.json`, `the-haunted-manor.json`).
- Supports defining the narrative graph.

### Quickstart / Runtime (`bot/src/quickstart`)

- **Party Session**: Logic for managing a party's session (`party-session.ts`).
- **Runtime Graph**: Manages the graph state during a run (`runtime-graph.ts`).
- **Embed Builder**: Helpers to create Discord embeds (`embed-builder.ts`).

## Missing/Incomplete Features

- **Backend Integration**: The bot currently seems to run standalone or with local state. It needs to connect to the `server` for persistent user profiles, party management, and state storage.
- **Multiplayer Orchestration**: While `party-session.ts` exists, the full API for creating/managing parties and synchronizing state across a distributed backend is likely missing or needs to be moved/interfaced with the `server`.
- **Role Assignment Persistance**: Role logic exists in the engine, but persisting this to a user's long-term profile in a database is required.
- **API Endpoints**: The bot likely needs to act as a client or be driven by the `server`'s state. The `endpoints_required.md` outlines the API that needs to be built in the `server` directory to support the bot.
