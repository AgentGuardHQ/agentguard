// Pure deterministic battle engine
// No UI coupling, no randomness, no side effects.
// All functions are pure — they return new state, never mutate inputs.

/**
 * @typedef {{ id: string, name: string, type: string, power: number, accuracy: number, pp: number }} Move
 * @typedef {{ id: string|number, name: string, type: string, maxHp: number, hp: number, attack: number, defense: number, speed: number, moves: Move[] }} BugMon
 * @typedef {{ active: BugMon }} BattleSide
 * @typedef {{ turn: number, player: BattleSide, enemy: BattleSide, log: string[], winner: 'player'|'enemy'|null }} BattleState
 * @typedef {{ actor: 'player'|'enemy', moveId: string }} ChosenAction
 */

/**
 * Look up type effectiveness multiplier from a type chart.
 * @param {string} moveType
 * @param {string} defenderType
 * @param {Record<string, Record<string, number>>} [typeChart]
 * @returns {number}
 */
export function getTypeMultiplier(moveType, defenderType, typeChart) {
  if (!typeChart) return 1;
  return typeChart[moveType]?.[defenderType] ?? 1;
}

/**
 * Find a move on a BugMon by id. Throws if not found.
 * @param {BugMon} bugmon
 * @param {string} moveId
 * @returns {Move}
 */
export function findMove(bugmon, moveId) {
  const move = bugmon.moves.find((m) => m.id === moveId);
  if (!move) {
    throw new Error(`${bugmon.name} does not know move ${moveId}`);
  }
  return move;
}

/** @param {BugMon} bugmon */
export function isFainted(bugmon) {
  return bugmon.hp <= 0;
}

/** @param {BattleState} state */
export function cloneState(state) {
  return structuredClone(state);
}

/**
 * Deterministic damage formula.
 * @param {BugMon} attacker
 * @param {BugMon} defender
 * @param {Move} move
 * @param {Record<string, Record<string, number>>} [typeChart]
 * @returns {number}
 */
export function calculateDamage(attacker, defender, move, typeChart) {
  const base = Math.max(1, move.power + attacker.attack - defender.defense);
  const multiplier = getTypeMultiplier(move.type, defender.type, typeChart);
  return Math.max(1, Math.floor(base * multiplier));
}

/**
 * Apply a single move. Returns new attacker, defender, and log entries.
 * Never mutates inputs.
 * @param {BugMon} attacker
 * @param {BugMon} defender
 * @param {Move} move
 * @param {Record<string, Record<string, number>>} [typeChart]
 * @returns {{ attacker: BugMon, defender: BugMon, log: string[] }}
 */
export function applyMove(attacker, defender, move, typeChart) {
  const log = [];

  if (move.pp <= 0) {
    log.push(`${attacker.name} tried to use ${move.name}, but it has no PP left.`);
    return { attacker, defender, log };
  }

  const updatedAttacker = {
    ...attacker,
    moves: attacker.moves.map((m) =>
      m.id === move.id ? { ...m, pp: m.pp - 1 } : m
    ),
  };

  // Deterministic hit check: hitRoll fixed at 100 for now.
  // Inject RNG later by replacing this constant.
  const hitRoll = 100;
  if (hitRoll > move.accuracy) {
    log.push(`${updatedAttacker.name} used ${move.name}, but it missed.`);
    return { attacker: updatedAttacker, defender, log };
  }

  const damage = calculateDamage(updatedAttacker, defender, move, typeChart);
  const multiplier = getTypeMultiplier(move.type, defender.type, typeChart);

  const updatedDefender = {
    ...defender,
    hp: Math.max(0, defender.hp - damage),
  };

  log.push(`${updatedAttacker.name} used ${move.name}.`);
  log.push(`${updatedDefender.name} took ${damage} damage.`);

  if (multiplier > 1) log.push('It was super effective.');
  if (multiplier < 1) log.push('It was not very effective.');
  if (isFainted(updatedDefender)) log.push(`${updatedDefender.name} fainted.`);

  return { attacker: updatedAttacker, defender: updatedDefender, log };
}

/**
 * Determine turn order by speed. Player wins ties.
 * @param {BugMon} player
 * @param {BugMon} enemy
 * @returns {Array<'player'|'enemy'>}
 */
export function getTurnOrder(player, enemy) {
  if (player.speed >= enemy.speed) {
    return ['player', 'enemy'];
  }
  return ['enemy', 'player'];
}

/**
 * Resolve a full turn. This is the one function your UI or simulator should call.
 * Pure function — returns a new BattleState, never mutates the input.
 * @param {BattleState} state
 * @param {[ChosenAction, ChosenAction]} actions
 * @param {Record<string, Record<string, number>>} [typeChart]
 * @returns {BattleState}
 */
export function resolveTurn(state, actions, typeChart) {
  if (state.winner) return state;

  const next = cloneState(state);
  next.turn += 1;
  next.log = [`Turn ${next.turn}`];

  const playerAction = actions.find((a) => a.actor === 'player');
  const enemyAction = actions.find((a) => a.actor === 'enemy');

  if (!playerAction || !enemyAction) {
    throw new Error('Both player and enemy actions are required');
  }

  const order = getTurnOrder(next.player.active, next.enemy.active);

  for (const actor of order) {
    if (next.winner) break;

    const attackerSide = actor === 'player' ? next.player : next.enemy;
    const defenderSide = actor === 'player' ? next.enemy : next.player;
    const action = actor === 'player' ? playerAction : enemyAction;

    if (isFainted(attackerSide.active) || isFainted(defenderSide.active)) {
      continue;
    }

    const move = findMove(attackerSide.active, action.moveId);
    const result = applyMove(attackerSide.active, defenderSide.active, move, typeChart);

    attackerSide.active = result.attacker;
    defenderSide.active = result.defender;
    next.log.push(...result.log);

    if (isFainted(next.enemy.active)) {
      next.winner = 'player';
      break;
    }

    if (isFainted(next.player.active)) {
      next.winner = 'enemy';
      break;
    }
  }

  return next;
}

/**
 * Create an initial BattleState from two BugMon.
 * @param {BugMon} playerMon
 * @param {BugMon} enemyMon
 * @returns {BattleState}
 */
export function createBattleState(playerMon, enemyMon) {
  return {
    turn: 0,
    player: { active: structuredClone(playerMon) },
    enemy: { active: structuredClone(enemyMon) },
    log: [],
    winner: null,
  };
}
