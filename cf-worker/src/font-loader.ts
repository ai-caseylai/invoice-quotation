import type { R2Bucket } from '@cloudflare/workers-types';

let cachedFont: ArrayBuffer | null = null;
let cachedHelveticaBold: ArrayBuffer | null = null;

const FONT_KEY = 'NotoSansSC-Regular.ttf';

function getHelveticaBold(): ArrayBuffer {
  if (!cachedHelveticaBold) {
    // Standard Helvetica-Bold is built into PDF-lib; we don't need the actual file.
    // pdf-lib uses Standard14 fonts natively. Return empty buffer as placeholder.
    cachedHelveticaBold = new ArrayBuffer(0);
  }
  return cachedHelveticaBold;
}

export async function loadChineseFont(bucket?: R2Bucket): Promise<ArrayBuffer> {
  if (cachedFont) return cachedFont;

  // Try R2 first
  if (bucket) {
    try {
      const obj = await bucket.get(FONT_KEY);
      if (obj) {
        cachedFont = await obj.arrayBuffer();
        console.log(`Font loaded from R2: ${(cachedFont.byteLength / 1024 / 1024).toFixed(1)}MB`);
        return cachedFont;
      }
    } catch (e) {
      console.warn('R2 font load failed, trying origin:', e);
    }
  }

  // Fallback: try loading from public Supabase Storage via fetch
  // (this gives us a bootstrapping path before R2 is configured)
  try {
    const resp = await fetch(
      'https://fcydqlusmtpgmwvfnopm.supabase.co/storage/v1/object/public/fonts/NotoSansSC-Regular.ttf'
    );
    if (resp.ok) {
      cachedFont = await resp.arrayBuffer();
      console.log(`Font loaded from Supabase fallback: ${(cachedFont.byteLength / 1024 / 1024).toFixed(1)}MB`);
      return cachedFont;
    }
  } catch (e) {
    console.warn('Supabase font fallback failed:', e);
  }

  throw new Error('Cannot load Chinese font: not found in R2 or Supabase');
}

export function getCachedHelveticaBold(): ArrayBuffer {
  return getHelveticaBold();
}

export function prewarmFont(bucket?: R2Bucket): void {
  // Start loading font without awaiting — subsequent requests benefit from cache
  loadChineseFont(bucket).catch(() => {});
}
