// modules/loader.js
import { info, error } from './logger.js';

const MODULE = 'loader.js';

/** Преобразует обычный github-URL в raw.githubusercontent.com */
export function toRawUrl(url) {
  const m = url.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/(?:blob|raw)\/(.+)$/);
  if (m) return `https://raw.githubusercontent.com/${m[1]}/${m[2]}/${m[3]}`;
  return url;
}

export async function loadFromUrl(url) {
  const raw = toRawUrl(url);
  info(MODULE, 'fetch', `GET ${raw}`);
  try {
    const r = await fetch(raw, { redirect: 'follow' });
    info(MODULE, 'fetch', `status ${r.status} ${r.statusText}`);
    if (!r.ok) throw new Error(`HTTP ${r.status} ${r.statusText}`);
    const text = await r.text();
    info(MODULE, '', `получено ${text.length} байт`);
    return text;
  } catch (e) {
    error(MODULE, 'fetch', `ошибка загрузки: ${e.message}`);
    throw e;
  }
}

export function loadFromFile(file) {
  return new Promise((resolve, reject) => {
    info(MODULE, 'FileReader', `чтение файла ${file.name} (${file.size} байт)`);
    const reader = new FileReader();
    reader.onload  = () => { info(MODULE, 'FileReader', 'файл прочитан'); resolve(reader.result); };
    reader.onerror = () => { error(MODULE, 'FileReader', reader.error?.message || 'unknown'); reject(reader.error); };
    reader.readAsText(file);
  });
}
