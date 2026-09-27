# Janin — Multiplayer Game Design Direction

## Three Possible Directions

| Theme Name | Very Brief Intro | Probability |
|---|---|---:|
| Orbit Relay | Clean 2D top-down arena play where pilots race between energy orbs and evade each other in short repeatable rounds. | 0.05 |
| Paper-Cut Clash | Hand-assembled characters in a tactile arena with coarse silhouettes and bright collectible markers. | 0.07 |
| Signal Garden | A warm abstract garden full of moving paths, where players collect shifting light fragments rather than attack. | 0.04 |

## Chosen Approach: Orbit Relay

### Design Movement
Janin adopts **modern arcade vector sport**: high-contrast midnight space, radiant collectible signals, concise telemetry, and clean geometric movement. It is intentionally visual-light so it loads quickly and sends only essential game state across the network.

### Core Principles
The screen communicates a player’s next action in a fraction of a second. Rooms are small, quick, and legible on a phone. Server authority is limited to movement, collectible ownership, scoring, and round time so the real-time protocol stays compact.

### Color Philosophy
Deep navy creates low-noise space. Electric chartreuse identifies a player’s own trail and action cues, while coral identifies rival pressure. Pale blue identifies neutral energy orbs. Each color maps to a gameplay role rather than merely decorating the arena.

### Layout Paradigm
The full device canvas is the arena. A narrow upper relay strip holds room code, round clock, and score. A lower-left movement pad and a lower-right dash control form the mobile cockpit, keeping the visual center free for multiplayer motion.

### Signature Elements
Circular orbit rings surround each energy orb, player craft leave short segmented vector trails, and every score collection produces a soft radial relay pulse.

### Interaction Philosophy
Janin is learned through immediate touch: steer with the directional pad or WASD/arrow keys, then use dash to win contested energy. A room code makes joining direct; players can practice with bots whenever a live server is unavailable.

### Animation
Motion is linear and responsive. Pulses expand for under 300ms, player ships turn smoothly rather than rotate instantly, and low-frequency star drift gives the background depth without consuming gameplay attention. Reduced-motion preferences disable decorative background drift and large pulses.

### Typography System
**Space Grotesk** provides game titles and scoreboard numbers; **IBM Plex Mono** presents rooms, ping, and control labels. Capitals and restrained tracking create a concise broadcast-system voice.

### Brand Essence
**Janin is a tiny, fast online arena for friends who want a real shared match without a heavy download or a long wait.**

The personality is **nimble, precise, and social**.

### Brand Voice
The voice is crisp and encouraging. Examples: “CLAIM THE NEXT SIGNAL.” and “ROOM LOCKED. RELAY LIVE.”

### Wordmark & Logo
The mark is a split circular orbit with a small electric chartreuse signal dot breaking through the ring. The JANIN wordmark is compact, uppercase, and slightly spaced like a tactical broadcast call sign.

### Signature Brand Color
**Janin Signal — #D9FF48** is the ownable action and success color.

## Style Decisions

The first visible frame is a live arena with moving bot craft, reachable energy orbs, the room controls, and the mobile movement cockpit. The upper telemetry strip stays narrow and functional. A player never has to dismiss a marketing-style panel before understanding the game board.
