// Universal EventBus — works in Node.js and browser
// No DOM, no Node.js-specific APIs

export class EventBus {
  constructor() { this.listeners = {}; }

  on(event, callback) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
  }

  emit(event, data) {
    if (!this.listeners[event]) return;
    for (const callback of this.listeners[event]) callback(data);
  }

  clear() { this.listeners = {}; }
}
