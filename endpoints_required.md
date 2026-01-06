# Yunami API Endpoints

## Auth & User

- `POST /auth/register` - { username, deviceId/discordId }
- `GET /user/me` - Returns current user profile, role, and story progress.

## Prologue (Solo)

- `POST /prologue/start` - Initialize a prologue story run.
- `POST /prologue/choice` - Submit a choice for the current scene.
- `POST /prologue/complete` - Finalize prologue, calculate and assign **Role**.

## Party & Lobby (Multiplayer)

- `POST /party/create` - Create a new party. Leader is the creator.
- `GET /party/:partyId` - Get party details, members, ready status.
- `POST /party/invite` - Generate an invite code (or invite user directly).
- `POST /party/join` - Join via code `{ code: "..." }`.
- `POST /party/:partyId/ready` - Toggle ready status.
- `DELETE /party/:partyId/leave` - Leave the current party.

## Story Engine

- `POST /story/start` - Leader starts the story for the party.
- `GET /story/:runId/state` - Poll for current scene, options, and other players' votes.
- `POST /story/:runId/choice` - Submit a vote or choice.
- `POST /story/:runId/vote` - Vote on a group decision.
- `POST /story/:runId/end` - Conclude the session.

## Resources & State

- `GET /story/:runId/resources` - Get shared inventory/resources.

## Admin / Debug

- `GET /health` - Service health check.
