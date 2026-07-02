'use strict';
// Minimal RFC 6455 WebSocket server protocol — handshake + frame codec.
// Replaces the `ws` npm package (which needs Node net/http/stream/crypto and
// can't run in the RN JS runtime). Server→client frames are unmasked; client→
// server frames are ALWAYS masked, per spec. We only relay small JSON text
// frames plus protocol ping/pong, but full framing (16/64-bit length,
// fragmentation, control frames) is implemented for correctness.
const { Buffer } = require('buffer');
const { sha1Bytes } = require('./sha1');

const WS_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

function computeAccept(key) {
  return Buffer.from(sha1Bytes(key + WS_GUID)).toString('base64');
}

function handshakeResponse(key) {
  const accept = computeAccept(key);
  return (
    'HTTP/1.1 101 Switching Protocols\r\n' +
    'Upgrade: websocket\r\n' +
    'Connection: Upgrade\r\n' +
    'Sec-WebSocket-Accept: ' + accept + '\r\n' +
    '\r\n'
  );
}

// Build an unmasked server frame. `opcode`: 0x1 text, 0x2 binary, 0x8 close,
// 0x9 ping, 0xA pong. `payload` is a Buffer.
function encodeFrame(opcode, payload) {
  payload = payload || Buffer.alloc(0);
  const len = payload.length;
  let header;
  if (len < 126) {
    header = Buffer.alloc(2);
    header[1] = len;
  } else if (len < 65536) {
    header = Buffer.alloc(4);
    header[1] = 126;
    header.writeUInt16BE(len, 2);
  } else {
    header = Buffer.alloc(10);
    header[1] = 127;
    // High 32 bits stay 0 — our payloads never exceed 4GB (capped at 64KB anyway).
    header.writeUInt32BE(0, 2);
    header.writeUInt32BE(len, 6);
  }
  header[0] = 0x80 | (opcode & 0x0f); // FIN=1
  return Buffer.concat([header, payload]);
}

function encodeText(str) { return encodeFrame(0x1, Buffer.from(str, 'utf8')); }
function encodePing() { return encodeFrame(0x9, Buffer.alloc(0)); }
function encodePong(payload) { return encodeFrame(0xA, payload || Buffer.alloc(0)); }
function encodeClose(code) {
  const b = Buffer.alloc(2);
  b.writeUInt16BE(code || 1000, 0);
  return encodeFrame(0x8, b);
}

// Stateful per-connection parser. feed(buffer) appends bytes and returns an
// array of decoded events: {type:'text'|'binary'|'ping'|'pong'|'close', data}.
// `data` is a string for text, a Buffer otherwise. Emits {type:'error'} if a
// frame exceeds maxPayload or the protocol is violated; caller should close.
class FrameParser {
  constructor(maxPayload) {
    this.buf = Buffer.alloc(0);
    this.max = maxPayload || (64 * 1024);
    this.fragOpcode = 0;
    this.fragChunks = [];
    this.fragLen = 0;
  }

  feed(chunk) {
    this.buf = this.buf.length ? Buffer.concat([this.buf, chunk]) : chunk;
    const out = [];
    while (true) {
      const frame = this._next(out);
      if (!frame) break;
    }
    return out;
  }

  // Try to decode one frame from this.buf. Pushes events to `out`. Returns true
  // if a frame was consumed (loop again), false if more bytes are needed.
  _next(out) {
    const b = this.buf;
    if (b.length < 2) return false;
    const fin = (b[0] & 0x80) !== 0;
    const opcode = b[0] & 0x0f;
    const masked = (b[1] & 0x80) !== 0;
    let len = b[1] & 0x7f;
    let offset = 2;

    if (len === 126) {
      if (b.length < 4) return false;
      len = b.readUInt16BE(2); offset = 4;
    } else if (len === 127) {
      if (b.length < 10) return false;
      const hi = b.readUInt32BE(2);
      const lo = b.readUInt32BE(6);
      len = hi * 0x100000000 + lo; offset = 10;
    }

    if (len > this.max || this.fragLen + len > this.max) {
      out.push({ type: 'error', reason: 'payload too large' });
      this.buf = Buffer.alloc(0);
      return false;
    }
    // Client frames MUST be masked.
    const maskLen = masked ? 4 : 0;
    if (b.length < offset + maskLen + len) return false;

    let payload = b.slice(offset + maskLen, offset + maskLen + len);
    if (masked) {
      const mask = b.slice(offset, offset + 4);
      const unmasked = Buffer.alloc(len);
      for (let i = 0; i < len; i++) unmasked[i] = payload[i] ^ mask[i & 3];
      payload = unmasked;
    }
    this.buf = b.slice(offset + maskLen + len);

    // Control frames (0x8/0x9/0xA): never fragmented, handle immediately.
    if (opcode >= 0x8) {
      if (opcode === 0x8) out.push({ type: 'close', data: payload });
      else if (opcode === 0x9) out.push({ type: 'ping', data: payload });
      else if (opcode === 0xA) out.push({ type: 'pong', data: payload });
      return true;
    }

    // Data frames + fragmentation (opcode 0 = continuation).
    if (opcode === 0x0) {
      this.fragChunks.push(payload);
      this.fragLen += payload.length;
    } else {
      this.fragOpcode = opcode;
      this.fragChunks = [payload];
      this.fragLen = payload.length;
    }
    if (fin) {
      const full = this.fragChunks.length === 1 ? this.fragChunks[0] : Buffer.concat(this.fragChunks);
      const op = this.fragOpcode;
      this.fragOpcode = 0; this.fragChunks = []; this.fragLen = 0;
      if (op === 0x1) out.push({ type: 'text', data: full.toString('utf8') });
      else out.push({ type: 'binary', data: full });
    }
    return true;
  }
}

module.exports = {
  WS_GUID,
  computeAccept,
  handshakeResponse,
  encodeFrame,
  encodeText,
  encodePing,
  encodePong,
  encodeClose,
  FrameParser,
};
