import { HfInference } from "@huggingface/inference";
import type { TranslationConfig } from "../types/index.js";

const JAPANESE_CHAR_REGEX = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/u;
const ENGLISH_CHAR_REGEX = /[A-Za-z]/;

const MODEL_MAP: Record<string, string> = {
  "ja-en": "Helsinki-NLP/opus-mt-ja-en",
  "en-ja": "Helsinki-NLP/opus-mt-en-ja",
};

export interface TranslateParams {
  text: string;
  targetLanguage: string;
  sourceLanguage?: string;
}

export const detectLanguageFromText = (text: string, fallback: string = "unknown"): string => {
  if (JAPANESE_CHAR_REGEX.test(text)) {
    return "ja";
  }

  if (ENGLISH_CHAR_REGEX.test(text)) {
    return "en";
  }

  return fallback;
};

const normalizeLanguageCode = (language?: string): string | undefined => {
  if (!language) {
    return undefined;
  }
  return language.toLowerCase().split("-")[0];
};

export class TranslationService {
  private inferenceClient: HfInference | null = null;

  constructor(private readonly config?: TranslationConfig) {
    if (config?.provider === "huggingface" && config.apiKey) {
      this.inferenceClient = new HfInference(config.apiKey);
    }
  }

  isEnabled(): boolean {
    return Boolean(this.inferenceClient);
  }

  detectLanguage(text: string): string {
    return detectLanguageFromText(text, this.config?.defaultSourceLanguage ?? "unknown");
  }

  async translate({ text, targetLanguage, sourceLanguage }: TranslateParams): Promise<string | null> {
    if (!this.inferenceClient) {
      return null;
    }

    const trimmed = text.trim();
    if (!trimmed) {
      return null;
    }

    const normalizedTarget = normalizeLanguageCode(targetLanguage);
    if (!normalizedTarget) {
      return null;
    }

    const normalizedSource = normalizeLanguageCode(sourceLanguage) ?? this.detectLanguage(trimmed);
    if (normalizedSource === normalizedTarget) {
      return trimmed;
    }

    const model = this.resolveModel(normalizedSource, normalizedTarget);
    if (!model) {
      console.warn("No translation model available for", normalizedSource, normalizedTarget);
      return null;
    }

    try {
      const response = await this.inferenceClient.translation({
        model,
        inputs: trimmed,
      });

      if (Array.isArray(response)) {
        return response[0]?.translation_text?.trim() ?? null;
      }

      if (response && typeof response === "object" && "translation_text" in response) {
        return (response as { translation_text?: string }).translation_text?.trim() ?? null;
      }

      return null;
    } catch (error) {
      console.error("Translation failed:", error);
      return null;
    }
  }

  private resolveModel(source?: string, target?: string): string | undefined {
    if (this.config?.model) {
      return this.config.model;
    }

    const key = `${source ?? ""}-${target ?? ""}`;
    if (MODEL_MAP[key]) {
      return MODEL_MAP[key];
    }

    if (target === "en") {
      return MODEL_MAP["ja-en"];
    }

    if (target === "ja") {
      return MODEL_MAP["en-ja"];
    }

    return undefined;
  }
}
