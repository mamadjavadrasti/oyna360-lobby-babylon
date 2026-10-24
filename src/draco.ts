import { DracoCompression } from '@babylonjs/core';
import { isTouchDevice } from '@oyna360/lobby-sdk';

const DECODER_DIR = '/vendor/draco';
let decoderBaseUrl: string | null = null;

/** Optional deployment override. Call before creating any avatars or lobbies. */
export function configureAvatarLoader(options: { dracoDecoderBaseUrl: string }) {
  if (typeof window === 'undefined') throw new Error('Avatar loading requires a browser environment');
  if (pending) throw new Error('Configure the avatar loader before creating avatars or lobbies');
  const url = new URL(options.dracoDecoderBaseUrl, window.location.href);
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error('dracoDecoderBaseUrl must be an HTTP(S) directory URL');
  }
  decoderBaseUrl = url.href.replace(/\/$/, '');
}

function candidateOrigins(assetUrl?: string): string[] {
  if (typeof window === 'undefined') return [];
  const origins: string[] = [];
  try {
    const webUrl = window.__OYNA360_DEV__?.platformWebUrl;
    if (webUrl) origins.push(new URL(webUrl).origin);
  } catch {
    /* ignore */
  }
  try {
    const ancestors = location.ancestorOrigins;
    if (ancestors?.length) {
      for (let i = 0; i < ancestors.length; i++) origins.push(ancestors[i]);
    }
  } catch {
    /* ignore */
  }
  try {
    const ref = document.referrer ? new URL(document.referrer).origin : '';
    if (ref) origins.push(ref);
  } catch {
    /* ignore */
  }
  try {
    if (assetUrl) {
      const url = new URL(assetUrl, window.location.href);
      if (url.protocol === 'http:' || url.protocol === 'https:') origins.push(url.origin);
    }
  } catch {
    /* ignore */
  }
  origins.push(window.location.origin);
  return [...new Set(origins.filter(Boolean))];
}

async function blobUrl(url: string, mime: string, signal: AbortSignal) {
  const res = await fetch(url, { mode: 'cors', credentials: 'omit', signal });
  if (!res.ok) throw new Error(`draco ${res.status} ${url}`);
  const buf = await res.arrayBuffer();
  return URL.createObjectURL(new Blob([buf], { type: mime }));
}

let pending: Promise<void> | null = null;

/**
 * Draco WASM must not load from cdn.babylonjs.com — that stalls the first
 * avatar (often 10s+ or forever on filtered networks). Fetch from the platform
 * origin, then wrap as blob URLs so the decoder worker is same-origin.
 */
export function ensureDracoDecoder(assetUrl?: string): Promise<void> {
  if (!pending) pending = installDracoDecoder(assetUrl);
  return pending;
}

async function installDracoDecoder(assetUrl?: string) {
  if (typeof window === 'undefined') return;
  DracoCompression.DefaultNumWorkers = isTouchDevice() ? 0 : 1;
  let lastError: unknown;
  const directories = decoderBaseUrl
    ? [decoderBaseUrl]
    : candidateOrigins(assetUrl).map((origin) => `${origin}${DECODER_DIR}`);
  for (const dir of directories) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6_000);
    try {
      const wasmUrl = await blobUrl(`${dir}/draco_wasm_wrapper_gltf.js`, 'text/javascript', controller.signal);
      const wasmBinaryUrl = await blobUrl(`${dir}/draco_decoder_gltf.wasm`, 'application/wasm', controller.signal);
      let fallbackUrl: string | undefined;
      try {
        fallbackUrl = await blobUrl(`${dir}/draco_decoder_gltf.js`, 'text/javascript', controller.signal);
      } catch {
        fallbackUrl = undefined;
      }
      DracoCompression.Configuration = {
        decoder: { wasmUrl, wasmBinaryUrl, fallbackUrl },
      };
      return;
    } catch (err) {
      lastError = err;
    } finally {
      clearTimeout(timer);
    }
  }
  // Fail closed: never fall back to the Babylon CDN (hangs the lobby).
  DracoCompression.Configuration = {
    decoder: {
      wasmUrl: '',
      wasmBinaryUrl: '',
    },
  };
  console.warn('[lobby-sdk] local Draco decoder missing; compressed GLBs will fail fast', lastError);
}
