'use strict';

const ShotVisuals = require('./shot-visuals.js');

const ENRICH_SHOT_VISUALS = process.env.ENRICH_SHOT_VISUALS !== '0';

function freshRoomFields() {
  return {
    viewport: null,
    tvTarget: 0,
    tvOvers: 0,
    milestoneState: ShotVisuals.defaultMilestoneState(),
  };
}

function applyViewport(room, m) {
  if (!room || !m || m.type !== 'viewport') return false;
  if (typeof m.W === 'number' && typeof m.H === 'number' && m.W > 0 && m.H > 0) {
    room.viewport = {
      W: m.W,
      H: m.H,
      batHandedness: m.batHandedness === 'left' ? 'left' : 'right',
    };
  }
  return true;
}

function trainingShotName(m) {
  if (m.dismissed) {
    const map = { bowled: 'BOWLED!', caught: 'CAUGHT!', lbw: 'LBW!' };
    return map[m.dismissalType] || 'OUT!';
  }
  const runs = m.runs || 0;
  if (runs >= 6) return 'SIX!';
  if (runs >= 4) return 'FOUR!';
  return 'TRAINING';
}

function noteGameState(room, m) {
  if (!room || !m) return;
  if (m.type === 'game_start') {
    room.tvTarget = m.targetScore || 0;
    room.tvOvers = m.oversToPlay || 0;
    room.milestoneState = ShotVisuals.defaultMilestoneState();
  } else if (m.type === 'game_resume') {
    room.tvTarget = m.target || 0;
    room.tvOvers = m.totalOvers || 0;
    room.milestoneState = ShotVisuals.defaultMilestoneState();
  } else if (m.type === 'shot' && typeof m.target === 'number') {
    room.tvTarget = m.target;
  }
}

function enrichOutgoingShot(room, m, roomCode) {
  if (!ENRICH_SHOT_VISUALS || !room?.viewport) return m;
  if (m.type !== 'shot' && m.type !== 'training_swing') return m;

  const vp = room.viewport;
  const shotLike = m.type === 'training_swing'
    ? {
      runs: m.runs || 0,
      dir: m.dir || 'str',
      dismissed: !!m.dismissed,
      dismissalType: m.dismissalType || null,
      name: trainingShotName(m),
      score: { runs: 0, wickets: 0, balls: 0 },
    }
    : m;

  const built = ShotVisuals.buildVisual(shotLike, {
    W: vp.W,
    H: vp.H,
    batHandedness: vp.batHandedness,
    tvTarget: room.tvTarget,
    tvOvers: room.tvOvers,
    milestoneState: room.milestoneState,
    roomCode,
    skipMilestones: m.type === 'training_swing',
  });

  if (built._milestoneState) room.milestoneState = built._milestoneState;
  const visual = Object.assign({}, built);
  delete visual._milestoneState;
  return Object.assign({}, m, { visual });
}

module.exports = {
  ENRICH_SHOT_VISUALS,
  freshRoomFields,
  applyViewport,
  noteGameState,
  enrichOutgoingShot,
};
