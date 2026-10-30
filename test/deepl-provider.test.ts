// File: test/deepl-provider.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { translateWithDeepL, resolveDeepLEndpoint, normalizeDeepLLang } from '../src/providers/deepl';

describe('DeepL Translation Provider (antfu/raycast-multi-translate#7)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('automatically routes :fx keys to api-free.deepl.com and standard keys to api.deepl.com', () => {
    expect(resolveDeepLEndpoint('123456-abc:fx')).toBe('https://api-free.deepl.com/v2/translate');
    expect(resolveDeepLEndpoint('123456-pro-key')).toBe('https://api.deepl.com/v2/translate');
  });

  it('normalizes target language codes for regional variants', () => {
    expect(normalizeDeepLLang('en')).toBe('EN-US');
    expect(normalizeDeepLLang('zh-cn')).toBe('ZH-HANS');
    expect(normalizeDeepLLang('ja')).toBe('JA');
  });

  it('calls DeepL v2 translate endpoint with Authorization header and returns translated text', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          translations: [{ detected_source_language: 'EN', text: 'Xin chào thế giới' }],
        }),
        { status: 200 }
      )
    );

    const res = await translateWithDeepL({
      text: 'Hello world',
      targetLang: 'vi',
      apiKey: 'my-free-key:fx',
    });

    expect(res.text).toBe('Xin chào thế giới');
    expect(res.detectedSourceLang).toBe('EN');
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://api-free.deepl.com/v2/translate',
      expect.objectContaining({
        method: 'POST',
        headers: {
          Authorization: 'DeepL-Auth-Key my-free-key:fx',
          'Content-Type': 'application/json',
        },
      })
    );
  });
});
