# Janin — Multiplayer Arena Plan

Janin is a top-down two-to-eight-player energy-collection arena. A round runs for 90 seconds. Players steer small relay craft, dash toward scarce energy orbs, and score a point for each orb claimed. The highest score at round end wins.

| Risk slice | Implementation | Completion check |
|---|---|---|
| Shared room state | A Node.js WebSocket server keeps a small in-memory room map and owns player coordinates, orbs, score, and the round clock. | Two browser clients joining the same room receive the same player and orb snapshot. |
| Low network cost | Clients send compact movement intent at 15 Hz; the server broadcasts small snapshots at 15 Hz. | The protocol sends only numeric coordinates, heading, score, and event deltas. |
| Mobile control | A directional pad controls motion and a dash trigger creates a speed burst. | A phone viewport has usable touch targets without blocking the arena. |
| Fallback mode | The browser runs a local bot simulation whenever a multiplayer endpoint is not configured. | The complete game remains playable from a GitHub Pages-style static preview. |
| APK route | Capacitor wraps the web client. The debug APK defaults to local practice and can connect to a HTTPS/WSS room-server URL configured in the game. | The Android debug build completes and the repository documents setting the multiplayer server URL. |

## Network Events

| Direction | Event | Compact payload |
|---|---|---|
| Client → server | `join` | room code, display name, color index |
| Client → server | `input` | horizontal and vertical intent, dash trigger |
| Server → client | `welcome` | assigned id, room details, complete initial snapshot |
| Server → client | `snapshot` | tick, players, orb list, remaining time |
| Server → client | `event` | orb claim, player join/leave, round completion |

The server does not persist accounts or profiles. This keeps the GitHub-deployable starter small and avoids collecting personal data. Each room has a maximum of eight participants and is automatically deleted after its last client leaves.
