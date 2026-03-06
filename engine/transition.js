// Battle transition - flash and fade
import { playTransitionFlash } from '../audio/sound.js';

let transition = null;

export function startTransition(wildMon) {
  transition = { wildMon, phase: 0, timer: 0, done: false };
  playTransitionFlash();
}

// Phases: flash(60), pause(80), flash(60), pause(80), flash(80), fade(300), hold(200)
const TRANSITION_PHASES = [60, 80, 60, 80, 80, 300, 200];
const TRANSITION_TYPES = ['flash', 'pause', 'flash', 'pause', 'flash', 'fade', 'hold'];

export function updateTransition(dt) {
  if (!transition || transition.done) return null;
  transition.timer += dt;
  if (transition.timer >= TRANSITION_PHASES[transition.phase]) {
    transition.timer = 0;
    transition.phase++;
    if (transition.phase < TRANSITION_PHASES.length && TRANSITION_TYPES[transition.phase] === 'flash') playTransitionFlash();
    if (transition.phase >= TRANSITION_PHASES.length) {
      transition.done = true;
      const mon = transition.wildMon;
      transition = null;
      return mon;
    }
  }
  return null;
}

export function drawTransitionOverlay(ctx, w, h, mapDrawFn) {
  if (!transition) return;
  mapDrawFn();
  const type = TRANSITION_TYPES[transition.phase];
  const p = transition.timer / TRANSITION_PHASES[transition.phase];
  if (type === 'flash') {
    const i = p < 0.5 ? p * 2 : (1 - p) * 2;
    ctx.fillStyle = `rgba(255,255,255,${(i * 0.9).toFixed(2)})`;
    ctx.fillRect(0, 0, w, h);
  } else if (type === 'fade') {
    ctx.fillStyle = `rgba(0,0,0,${p.toFixed(2)})`;
    ctx.fillRect(0, 0, w, h);
  } else if (type === 'hold') {
    ctx.fillStyle = 'rgba(0,0,0,1)';
    ctx.fillRect(0, 0, w, h);
  }
}
