# Janin — Orbit Relay

**Janin** is a lightweight online multiplayer arena game written in **HTML, CSS, and JavaScript**. Players steer relay craft, dash toward energy orbs, and compete for the highest signal score in quick 90-second shared rooms.

The repository contains two usable modes. **Practice Relay** runs immediately in the browser with local rival craft, requiring no server. **Live Rooms** use the included Node.js WebSocket process; players join the same room code from separate devices after it is deployed to a public WebSocket URL.

## Run the Client Locally

Install dependencies and start the Vite client.

```bash
pnpm install
pnpm dev
```

Open the displayed address, select **ROOM**, and either practice or enter a live server URL. The mobile control layout uses the lower-left movement pad and lower-right dash button. Desktop testing supports WASD, arrow keys, and Space.

| Mode | What it does | Connection requirement |
|---|---|---|
| Practice Relay | Simulates three local rival craft and lets one player learn the arena. | None |
| Live Room | Shares movement, energy-orb claims, score, and the round clock with up to eight participants. | A deployed `wss://` room-server URL |

## Run the Multiplayer Server

The room process is intentionally separate from the static client so it can be deployed to any Node.js host that supports WebSockets.

```bash
pnpm install
PORT=8787 pnpm multiplayer:server
```

For local testing, enter `ws://127.0.0.1:8787` in the game’s **SERVER URL** field. For a public HTTPS game or the Android APK, deploy the room process behind TLS and enter its `wss://` URL. The server exposes `GET /health` for a basic availability check.

> The server holds room state only in memory. Restarting it clears active rooms and scores; this keeps the starter efficient and avoids account or profile storage.

## Tests

```bash
pnpm test                           # game loop: practice clock, round end, online snapshots
node multiplayer-server.mjs &       # then, with the room server running:
pnpm test:multiplayer               # two clients share room SMOKE; hostile messages are rejected
```

The multiplayer test opens two WebSocket clients, makes them join room `SMOKE`, and confirms that a two-player authoritative snapshot is broadcast. It then sends a `null` message and an oversized message and checks that the server keeps running.

## Build the Android APK

The Capacitor wrapper creates a debug APK. An Android SDK, Android Build Tools, and a Java Development Kit are required on the build machine.

```bash
pnpm android:debug
```

The result is written to:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

The debug APK from the original build is attached to the [GitHub releases](https://github.com/Apurba94/janin-game/releases). It predates the fixes in this repository; build from source for the current version.

The debug APK launches in Practice Relay by default. To play online, open **ROOM** and configure the public `wss://` room-server URL. A signed release APK requires a publisher-owned Android signing keystore.

## Project Layout

| Location | Responsibility |
|---|---|
| `client/index.html` | Mobile-first game shell and accessible room controls. |
| `client/src/janin-game.js` | Canvas rendering, local bot fallback, craft movement, energy-orb scoring, and touch-ready simulation. |
| `client/src/network.js` | Compact WebSocket connection and input-message client. |
| `client/src/main.js` | UI, keyboard/touch inputs, room form, and game/network integration. |
| `multiplayer-server.mjs` | Self-hosted authoritative room server. |
| `scripts/test-multiplayer.mjs` | Two-client WebSocket smoke and robustness test. |
| `tests/arena.test.mjs` | Headless game-loop test. |
| `android/` | Capacitor Android project. |

## Network Design

Clients send only steering intent and dash requests at a capped cadence. The server advances each room at a fixed tick rate, owns player positions and orb claims, and broadcasts compact snapshots at 15 updates per second. This makes short browser rooms responsive without synchronizing large asset or world-state payloads.

## Credits

Created by **Janin A Apurba**. Released under the [MIT License](LICENSE).

## Follow Janin on YouTube

If this project helped you, please follow and subscribe:

- **Study with Janin**: [youtube.com/@studywithjanin](https://www.youtube.com/@studywithjanin)
- **Pomodoro Study with Janin**: [youtube.com/@pomodorostudywithjanin3326](https://www.youtube.com/@pomodorostudywithjanin3326)
