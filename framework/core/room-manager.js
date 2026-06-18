'use strict';

/**
 * Generic Room Manager for TV + Mobile Game Framework
 * Handles room states, active socket connections, and culling of abandoned sessions.
 */
class RoomManager {
  constructor() {
    this.rooms = new Map();
  }

  /**
   * Generates a unique 6-character room code.
   */
  generateCode() {
    const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code;
    do {
      code = Array.from({ length: 6 }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join('');
    } while (this.rooms.has(code));
    return code;
  }

  /**
   * Creates or gets a room.
   */
  createRoom(code) {
    if (this.rooms.has(code)) {
      return this.rooms.get(code);
    }
    const room = {
      code,
      screen: null,   // TV socket
      bat: null,      // Mobile socket
      created: Date.now(),
      lastActivity: Date.now(),
      meta: {}        // Unstructured storage for game-specific states (e.g. scores, configuration)
    };
    this.rooms.set(code, room);
    return room;
  }

  getRoom(code) {
    if (!code) return null;
    return this.rooms.get(code.toUpperCase());
  }

  deleteRoom(code) {
    const room = this.rooms.get(code);
    if (!room) return false;

    // Terminate connections gracefully
    try { if (room.screen) room.screen.terminate(); } catch (_) {}
    try { if (room.bat) room.bat.terminate(); } catch (_) {}

    return this.rooms.delete(code);
  }

  /**
   * Periodic sweep to clear inactive rooms (no socket activity).
   */
  sweep(idleTimeoutMs = 1800000) { // Default 30 min
    const now = Date.now();
    const cut = now - 600000; // 10 min grace for newly created empty rooms
    
    for (const [code, room] of this.rooms) {
      const screenAlive = room.screen && room.screen.readyState === 1;
      const batAlive = room.bat && room.bat.readyState === 1;

      // Never cull a room with a live socket
      if (screenAlive || batAlive) {
        continue;
      }

      // If room is empty and older than 10 mins OR has been inactive for timeoutMs, cull it
      const createdThresholdPassed = room.created < cut;
      const idleThresholdPassed = (now - (room.lastActivity || room.created)) > idleTimeoutMs;

      if (createdThresholdPassed && idleThresholdPassed) {
        this.deleteRoom(code);
      }
    }
  }
}

module.exports = new RoomManager();
