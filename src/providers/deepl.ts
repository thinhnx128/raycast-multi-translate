// File: src/providers/deepl.ts
// Target Issue: https://github.com/antfu/raycast-multi-translate/issues/7
// Author: Xuan Thinh (@thinhnx128) <thinhnx128@gmail.com>

export interface DeepLTranslateOptions {
  text: string;
  sourceLang?: string;
  targetLang: string;
  apiKey: string;
  formality?: 'default' | 'more' | 'less' | 'prefer_more' | 'prefer_less';
}

export interface DeepLTranslationItem {
  detected_source_language: string;
  text: string;
}

export interface DeepLResponse {
  translations: DeepLTranslationItem[];
}

const LANGUAGE_MAP: Record<string, string> = {
  en: 'EN-US',
  'en-us': 'EN-US',
  'en-gb': 'EN-GB',
  pt: 'PT-BR',
  'pt-br': 'PT-BR',
  'pt-pt': 'PT-PT',
  zh: 'ZH-HANS',
  'zh-cn': 'ZH-HANS',
  'zh-tw': 'ZH-HANT',
};

export function normalizeDeepLLang(code: string, isSource = false): string {
  const normalized = code.trim().toLowerCase();
  if (isSource) {
    return normalized.split('-')[0].toUpperCase();
  }
  return LANGUAGE_MAP[normalized] ?? normalized.toUpperCase();
}

export function resolveDeepLEndpoint(apiKey: string): string {
  const trimmed = apiKey.trim();
  return trimmed.endsWith(':fx')
    ? 'https://api-free.deepl.com/v2/translate'
    : 'https://api.deepl.com/v2/translate';
}

/**
 * Translates text using the official DeepL v2 REST API.
 * Automatically detects Free (:fx suffix) vs Pro API keys.
 */
export async function translateWithDeepL(options: DeepLTranslateOptions): Promise<{
  text: string;
  detectedSourceLang: string;
}> {
  const { text, sourceLang, targetLang, apiKey, formality } = options;
  if (!apiKey || !apiKey.trim()) {
    throw new Error('DeepL API Key is required. Configure it in Raycast Preferences.');
  }

  const endpoint = resolveDeepLEndpoint(apiKey);
  const body: Record<string, unknown> = {
    text: [text],
    target_lang: normalizeDeepLLang(targetLang, false),
  };

  if (sourceLang && sourceLang !== 'auto') {
    body.source_lang = normalizeDeepLLang(sourceLang, true);
  }
  if (formality && formality !== 'default') {
    body.formality = formality;
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `DeepL-Auth-Key ${apiKey.trim()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (response.status === 403) {
    throw new Error('DeepL API authentication failed (403). Please verify your DeepL API key.');
  }
  if (response.status === 456) {
    throw new Error('DeepL API quota exceeded (456). Character limit reached.');
  }
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`DeepL API error (${response.status}): ${errText}`);
  }

  const data = (await response.json()) as DeepLResponse;
  const first = data.translations?.[0];
  if (!first) {
    throw new Error('DeepL API returned an empty translations array.');
  }

  return {
    text: first.text,
    detectedSourceLang: first.detected_source_language,
  };
}
