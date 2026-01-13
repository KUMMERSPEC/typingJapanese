// js/common/idCodec.js

// Utility for safe key encoding to avoid special chars in JSON keys when chunking
// encodeId: URI-encode then Base64-encode -> pure ASCII (URL safe variant)
// decodeId: reverse process

export function encodeId(str = '') {
  try {
    // btoa may throw for unicode, so first encodeURIComponent
    return btoa(encodeURIComponent(str));
  } catch (e) {
    console.warn('[idCodec] encodeId failed', e);
    return str; // fallback – return original to avoid crash
  }
}

export function decodeId(str = '') {
  try {
    return decodeURIComponent(atob(str));
  } catch (e) {
    console.warn('[idCodec] decodeId failed', e);
    return str; // fallback
  }
}

