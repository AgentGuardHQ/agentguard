// Shared ANSI color constants for CLI output
// Respects NO_COLOR convention (https://no-color.org/)

const enabled = !process.env.NO_COLOR;

const ESC = '\x1b[';
export const RESET = enabled ? `${ESC}0m` : '';
export const BOLD = enabled ? `${ESC}1m` : '';
export const DIM = enabled ? `${ESC}2m` : '';

export const FG = {
  black: enabled ? `${ESC}30m` : '',
  red: enabled ? `${ESC}31m` : '',
  green: enabled ? `${ESC}32m` : '',
  yellow: enabled ? `${ESC}33m` : '',
  blue: enabled ? `${ESC}34m` : '',
  magenta: enabled ? `${ESC}35m` : '',
  cyan: enabled ? `${ESC}36m` : '',
  white: enabled ? `${ESC}37m` : '',
  gray: enabled ? `${ESC}90m` : '',
};

export const TYPE_COLORS = {
  frontend: 'blue',
  backend: 'red',
  devops: 'yellow',
  testing: 'green',
  architecture: 'magenta',
  security: 'red',
  ai: 'cyan',
};

/** Colorize text with a foreground color. */
export function color(text, fg) {
  return `${FG[fg] || ''}${text}${RESET}`;
}

/** Bold text. */
export function bold(text) {
  return `${BOLD}${text}${RESET}`;
}

/** Dim text. */
export function dim(text) {
  return `${DIM}${text}${RESET}`;
}

/** Strip ANSI escape codes to get visible character count. */
export function visLen(str) {
  return str.replace(/\x1b\[[0-9;]*m/g, '').length;
}

/** Pad a string (possibly containing ANSI codes) to a visible width. */
export function padVis(str, width) {
  const diff = width - visLen(str);
  return diff > 0 ? str + ' '.repeat(diff) : str;
}
