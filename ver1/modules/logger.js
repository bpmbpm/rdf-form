// modules/logger.js
const logEl = () => document.getElementById('view-log');

const LEVELS = {
  info:  { tag: 'INFO ', cls: '' },
  warn:  { tag: 'WARN ', cls: 'warn' },
  error: { tag: 'ERROR', cls: 'error' },
  debug: { tag: 'DEBUG', cls: 'debug' },
};

function ts() {
  return new Date().toISOString();
}

/**
 * @param {'info'|'warn'|'error'|'debug'} level
 * @param {string} module  имя модуля, напр. 'parser.js'
 * @param {string} library имя внешней библиотеки, напр. 'N3.Parser'
 * @param {string} message текст сообщения
 */
export function log(level, module, library, message) {
  const el = logEl();
  const lv = LEVELS[level] || LEVELS.info;
  const lib = library ? ` [${library}]` : '';
  const line = `[${ts()}] [${lv.tag}] [${module}]${lib} ${message}\n`;
  if (el) {
    el.textContent += line;
    el.scrollTop = el.scrollHeight;
  }
  // Дублируем в консоль для отладки
  // eslint-disable-next-line no-console
  console[level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log'](line.trimEnd());
}

export function clearLog() {
  const el = logEl();
  if (el) el.textContent = '';
  log('info', 'logger.js', '', 'Лог очищен');
}

export const info  = (m, l, s) => log('info',  m, l, s);
export const warn  = (m, l, s) => log('warn',  m, l, s);
export const error = (m, l, s) => log('error', m, l, s);
export const debug = (m, l, s) => log('debug', m, l, s);
