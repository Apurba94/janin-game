# Janin — Asset Manifest

**Art direction:** modern arcade vector sport, with midnight navy space, electric chartreuse player signals, coral opponents, pale-blue neutral energy, thin orbital rings, and crisp geometric silhouettes optimized for a small mobile canvas.

| Asset | Role | Intended display size | Managed URL |
|---|---|---:|---|
| Janin arena visual target | First-frame art and UX reference | Full 9:16 viewport | `/manus-storage/janin-arena-reference_ce02ffda.png` |
| Janin signal mark | Menu and Android application mark | 96×96 px | `/manus-storage/janin-logo_461c5ab7.png` |
| Relay craft kit | Visual reference for the four canvas-rendered player craft states | 72×72 px | `/manus-storage/janin-craft-kit_fcffea52.png` |
| Energy orb kit | Visual reference for canvas collectible effects | 48×48 px | `/manus-storage/janin-orb-kit_7cee16b1.png` |
| Arena background | Low-noise background visual treatment | Full 9:16 viewport | `/manus-storage/janin-arena-bg_86625377.png` |

The client uses the arena and logo art directly, while its craft and orb visuals are canvas-drawn to preserve clear hit areas and very low network overhead. Original generated files remain outside the project tree; the runtime references only the managed URLs listed above.
