# Janin — Source Structure

| Location | Responsibility |
|---|---|
| `client/index.html` | HTML shell and metadata for the mobile canvas experience. |
| `client/src/main.js` | Responsive UI, room form, canvas boot sequence, touch/keyboard inputs, and client connection selection. |
| `client/src/janin-game.js` | Canvas renderer, client prediction, local practice bots, and game UI state. |
| `client/src/network.js` | WebSocket connection lifecycle, event encoding, snapshot handling, reconnect logic, and local fallback boundary. |
| `client/src/style.css` | Orbit Relay visual system and responsive mobile controls. |
| `multiplayer-server.mjs` | Standalone Node.js WebSocket room server for self-hosting. |
| `server/index.ts` | Static site host only; the live WebSocket process is intentionally separate for external Node.js deployment. |
| `capacitor.config.ts` | Android wrapper configuration. |

## Room State

```text
Room { code, players: Map<id, Player>, orbs: Orb[], roundStart, nextOrbAt }
Player { id, name, color, x, y, vx, vy, dashUntil, score, input }
Orb { id, x, y, hue }
```

The server advances rooms at a fixed 30 Hz. Players send intent rather than positions, so a client cannot claim an arbitrary location. Browser clients interpolate remote snapshots, while the local craft uses a short prediction window for smooth immediate steering.
