// modules/clipboard.js
import { info, error } from './logger.js';

const MODULE = 'clipboard.js';

export async function readClipboard() {
  info(MODULE, 'navigator.clipboard', 'readText');
  try {
    const text = await navigator.clipboard.readText();
    info(MODULE, '', `получено ${text.length} байт`);
    return text;
  } catch (e) {
    error(MODULE, 'navigator.clipboard', e.message);
    throw e;
  }
}

export async function writeClipboard(text) {
  info(MODULE, 'navigator.clipboard', `writeText (${text.length} байт)`);
  try {
    await navigator.clipboard.writeText(text);
    info(MODULE, '', 'скопировано');
  } catch (e) {
    error(MODULE, 'navigator.clipboard', e.message);
    throw e;
  }
}

export function downloadFile(filename, text, mime = 'text/plain;charset=utf-8') {
  info(MODULE, 'Blob/URL', `скачивание ${filename} (${text.length} байт)`);
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
