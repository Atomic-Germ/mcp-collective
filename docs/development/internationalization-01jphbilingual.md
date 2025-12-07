---
description: 国際化ポリシーと日英コンテンツの維持方法 / Internationalization policies for Japanese & English
ruleId: internationalization-01jphbilingual
tags:
  - documentation
  - internationalization
  - development
globs:
  - '**/*.md'
  - '**/*.mdx'
---

# Internationalization Guide / 国際化ガイド

## Goals / 目的
- Ensure every user-facing touch point offers both Japanese and English context.
- Keep the knowledge base searchable regardless of the query language.
- Document a repeatable workflow so future contributions remain bilingual.

## Documentation workflow / ドキュメント作成手順
1. **Author in your strongest language.** Use clear headings and structure.
2. **Add the sister language section.** You can:
   - Write a native translation by hand, or
   - Mark the section with `> Pending translation` and open a follow-up task, or
   - Run the `rag_search` translation layer locally (see below) and paste/edit the output.
3. **Label sections explicitly.** Use headings such as `## English` / `## 日本語` or inline tags `(EN)/(JA)` so assistants can segment content.
4. **Avoid duplicating IDs.** When using Markdown heading links, ensure English and Japanese headings are unique.

## Translation layer / 翻訳レイヤーの使い方
- Set `HUGGINGFACE_API_KEY` and (optionally) `TRANSLATION_MODEL` in your environment.
- Run `npm run dev` and call the `rag_search` tool with `targetLanguage` to preview translations.
- The service adds `language`, `translatedContent`, `translationLanguage`, `translationProvider` fields; copy only what you need into the docs.
- Disable noisy metadata by setting `include.language` or `include.translation` to `false`.

## Knowledge base tips / ナレッジベース運用メモ
- Store canonical source files under `docs/` and keep English mirrors adjacent (e.g., `README.md` with both sections, or `guide.ja.md` + `guide.en.md`).
- Prefer bilingual tables instead of duplicating long prose when the content is mostly structural (e.g., environment-variable lists).
- When referencing external scripts (Weaviate, Pinecone, etc.), add inline comments for both languages so shell history stays readable.
- Mention whether a document has been machine-translated; reviewers can then prioritize human passes.

## Review checklist / レビュー時の確認事項
- [ ] Does the PR touch any user-facing string? Provide EN + JA.
- [ ] Did you update the README or related guide when adding environment variables or CLI flags?
- [ ] If translation is pending, did you open an issue or leave a clear TODO with context?
- [ ] Are test fixtures updated so `rag_search` continues to return bilingual metadata?

By following this guide we keep the repository equally welcoming to English and Japanese users while avoiding unnecessary duplication.
