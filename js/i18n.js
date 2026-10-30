// BAM Chemistry Lab — Internationalization
// Supported: en (English), ur (Urdu)
// To add new language: create data/i18n/XX.json with same keys

const SUPPORTED_LANGS = ['en', 'ur'];
const DEFAULT_LANG = 'en';
const STORAGE_KEY = 'bamchem_lang';

let currentLang = DEFAULT_LANG;
let translations = {};
let listeners = [];

async function loadLanguage(lang) {
  if (!SUPPORTED_LANGS.includes(lang)) lang = DEFAULT_LANG;
  try {
    const res = await fetch(`data/i18n/${lang}.json`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    translations = await res.json();
    currentLang = lang;
    localStorage.setItem(STORAGE_KEY, lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ur' ? 'rtl' : 'ltr';
    applyTranslations();
    updateSwitcher();
    listeners.forEach(fn => fn(lang));
    return true;
  } catch (err) {
    console.error('i18n load failed:', err);
    return false;
  }
}

function t(key) {
  const parts = key.split('.');
  let val = translations;
  for (const p of parts) {
    if (val && typeof val === 'object' && p in val) {
      val = val[p];
    } else {
      return key;
    }
  }
  return typeof val === 'string' ? val : key;
}

function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.getAttribute('data-i18n'));
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.placeholder = t(el.getAttribute('data-i18n-placeholder'));
  });
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    el.title = t(el.getAttribute('data-i18n-title'));
  });
  document.querySelectorAll('[data-i18n-aria-label]').forEach(el => {
    el.setAttribute('aria-label', t(el.getAttribute('data-i18n-aria-label')));
  });
}

function updateSwitcher() {
  const sw = document.getElementById('langSwitcher');
  if (sw) sw.value = currentLang;
}

function onLangChange(fn) {
  listeners.push(fn);
}

async function init() {
  const saved = localStorage.getItem(STORAGE_KEY);
  const browserLang = (navigator.language || 'en').slice(0, 2);
  const initial = saved || (SUPPORTED_LANGS.includes(browserLang) ? browserLang : DEFAULT_LANG);
  return loadLanguage(initial);
}

document.addEventListener('DOMContentLoaded', () => {
  const sw = document.getElementById('langSwitcher');
  if (sw) {
    sw.addEventListener('change', (e) => loadLanguage(e.target.value));
  }
});

window.BAMi18n = { init, load: loadLanguage, t, onLangChange, getLang: () => currentLang };
