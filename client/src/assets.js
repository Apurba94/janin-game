// Orbit Relay visual assets. Everything the game needs ships in client/public.

export const ASSETS = {
  logo: "/janin-logo.svg",
};

// Optional canvas art drawn beneath the procedural arena when present,
// e.g. { arena: "/arena-bg.png" }. The arena renders fully without it.
const CANVAS_ART = {};

export function preloadAssets() {
  return Object.fromEntries(Object.entries(CANVAS_ART).map(([key, source]) => {
    const image = new Image();
    image.decoding = "async";
    image.src = source;
    return [key, image];
  }));
}
