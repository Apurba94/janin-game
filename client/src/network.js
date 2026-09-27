// Orbit Relay network client: compact intent messages, resilient WebSocket lifecycle, and practice-mode boundary.

const normaliseServerUrl = (value) => {
  if (!value) return "";
  const trimmed = value.trim().replace(/\/$/, "");
  if (trimmed.startsWith("ws://") || trimmed.startsWith("wss://")) return trimmed;
  return `${location.protocol === "https:" ? "wss" : "ws"}://${trimmed}`;
};

export class JaninNetwork {
  constructor({ onStatus, onWelcome, onSnapshot, onEvent }) {
    this.onStatus = onStatus;
    this.onWelcome = onWelcome;
    this.onSnapshot = onSnapshot;
    this.onEvent = onEvent;
    this.socket = null;
    this.connected = false;
    this.lastInput = 0;
  }

  connect({ serverUrl, room, name, color }) {
    const target = normaliseServerUrl(serverUrl);
    if (!target) {
      this.onStatus({ mode: "practice", label: "PRACTICE RELAY" });
      return false;
    }
    this.disconnect();
    this.onStatus({ mode: "connecting", label: "LINKING…" });
    try {
      this.socket = new WebSocket(target);
    } catch {
      this.onStatus({ mode: "error", label: "LINK FAILED" });
      return false;
    }
    this.socket.addEventListener("open", () => {
      this.connected = true;
      this.socket.send(JSON.stringify({ t: "join", r: room.toUpperCase(), n: name.slice(0, 14), c: color }));
    });
    this.socket.addEventListener("message", ({ data }) => {
      try {
        const message = JSON.parse(data);
        if (message.t === "welcome") this.onWelcome(message);
        if (message.t === "snapshot") this.onSnapshot(message);
        if (message.t === "event") this.onEvent(message);
      } catch {
        this.onStatus({ mode: "error", label: "BAD SIGNAL" });
      }
    });
    this.socket.addEventListener("close", () => {
      if (this.connected) this.onStatus({ mode: "offline", label: "LINK LOST · PRACTICE" });
      this.connected = false;
    });
    this.socket.addEventListener("error", () => this.onStatus({ mode: "error", label: "LINK FAILED" }));
    return true;
  }

  sendInput(input) {
    const now = performance.now();
    if (!this.connected || !this.socket || this.socket.readyState !== WebSocket.OPEN || now - this.lastInput < 66) return;
    this.lastInput = now;
    this.socket.send(JSON.stringify({ t: "input", x: Math.round(input.x * 100) / 100, y: Math.round(input.y * 100) / 100, d: input.dash ? 1 : 0 }));
  }

  disconnect() {
    if (this.socket) this.socket.close();
    this.socket = null;
    this.connected = false;
  }
}
