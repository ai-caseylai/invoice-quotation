// Font loading approach mirrors secretarysystem:
// Fetch NotoSansTC from Google Fonts CDN at runtime, no bundled/bundled fonts.
// Cached in memory for subsequent requests within same Worker instance.

let cachedFont: ArrayBuffer | null = null;

const FONT_CDN_URLS = [
  'https://fonts.gstatic.com/ea/notosanstc/v1/NotoSansTC-Regular.otf',
  'https://cdn.jsdelivr.net/fontsource/fonts/noto-sans-tc@latest/chinese-traditional-400-normal.woff2',
];

export async function loadChineseFont(): Promise<ArrayBuffer> {
  if (cachedFont) return cachedFont;

  for (const url of FONT_CDN_URLS) {
    try {
      const resp = await fetch(url);
      if (resp.ok) {
        cachedFont = await resp.arrayBuffer();
        console.log(`Font loaded from CDN (${(cachedFont.byteLength / 1024 / 1024).toFixed(1)}MB): ${url}`);
        return cachedFont;
      }
    } catch (e) {
      console.warn(`CDN font failed: ${url}`, e);
    }
  }

  throw new Error('Cannot load Chinese font from any CDN source');
}

export function prewarmFont(): void {
  loadChineseFont().catch(() => {});
}
