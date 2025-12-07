# Shared Knowledge MCP Server

[English](#english) | [日本語](#日本語)

## English

### Overview
Shared Knowledge MCP Server is a Retrieval Augmented Generation (RAG) service that exposes a shared knowledge base to multiple AI assistants (CLINE, Cursor, Windsurf, Claude Desktop, etc.) via the Model Context Protocol (MCP). It now ships with first-class multilingual support so English speakers receive the same experience as Japanese speakers—documentation, tooling, and responses are all available in both languages.

### Features
- **Shared knowledge base** that every assistant can query for consistent answers.
- **High-accuracy RAG search** with hybrid (vector + keyword) support when using Weaviate.
- **Type-safe TypeScript implementation** with clear service boundaries.
- **Multiple vector stores** (HNSWLib, Chroma, Pinecone, Milvus, Weaviate) selectable at runtime.
- **Built-in translation layer** powered by Hugging Face Inference so search results can be auto-translated (e.g., Japanese → English).

### Installation
```bash
git clone https://github.com/yourusername/shared-knowledge-mcp.git
cd shared-knowledge-mcp
npm install
```

### Configuration
Specify the MCP server inside each assistant configuration. Example for VS Code (CLINE / Cursor):

```json
{
  "mcpServers": {
    "shared-knowledge-base": {
      "command": "node",
      "args": ["/path/to/shared-knowledge-mcp/dist/index.js"],
      "env": {
        "KNOWLEDGE_BASE_PATH": "/path/to/your/rules",
        "OPENAI_API_KEY": "your-openai-api-key",
        "SIMILARITY_THRESHOLD": "0.7",
        "CHUNK_SIZE": "1000",
        "CHUNK_OVERLAP": "200",
        "VECTOR_STORE_TYPE": "hnswlib",
        "HUGGINGFACE_API_KEY": "your-huggingface-api-key",
        "DEFAULT_SOURCE_LANGUAGE": "ja",
        "DEFAULT_TARGET_LANGUAGE": "en"
      }
    }
  }
}
```

> Tip: Pinecone, Weaviate, Milvus, and Chroma configurations follow the same pattern—just change `VECTOR_STORE_TYPE` and provide the corresponding `VECTOR_STORE_CONFIG` JSON.

#### Environment variables
| Variable | Description | Default |
| --- | --- | --- |
| `KNOWLEDGE_BASE_PATH` | Absolute path to the docs / rules directory | (required) |
| `OPENAI_API_KEY` | Enables OpenAI embeddings; falls back to Ollama if omitted | _none_ |
| `SIMILARITY_THRESHOLD` | Minimum similarity score (0–1) | `0.7` |
| `CHUNK_SIZE` | Characters per chunk | `1000` |
| `CHUNK_OVERLAP` | Overlap between chunks | `200` |
| `VECTOR_STORE_TYPE` | `hnswlib`, `chroma`, `pinecone`, `milvus`, or `weaviate` | `hnswlib` |
| `VECTOR_STORE_CONFIG` | JSON string with vector store options | `{}` |
| `HUGGINGFACE_API_KEY` | Enables the translation layer | _none_ |
| `DEFAULT_SOURCE_LANGUAGE` | Language code for stored docs | `ja` |
| `DEFAULT_TARGET_LANGUAGE` | Language code used when no `targetLanguage` is provided in requests | `en` |
| `TRANSLATION_MODEL` | Optional Hugging Face translation model override | auto |

### Multilingual search & translation
Set `HUGGINGFACE_API_KEY` to activate translations. When calling `rag_search`, supply `targetLanguage: "en"` (or any BCP-47 code). The server will:
1. Detect the language of every document chunk.
2. Return the original text plus `language`, `translatedContent`, `translationLanguage`, and `translationProvider` metadata (unless disabled).
3. Respect `include.translation` or `include.language` flags if you want to trim the payload.

Example tool invocation:
```typescript
const result = await callTool("rag_search", {
  query: "コミットメッセージのフォーマット",
  targetLanguage: "en",
  include: {
    summary: true,
    translation: true
  }
});
```

### Tool reference
`rag_search` accepts the following parameters:
- `query` (string, required)
- `limit` (number)
- `useHybridSearch` (boolean, Weaviate only)
- `hybridAlpha` (number 0–1)
- `context` (string)
- `targetLanguage` / `sourceLanguage`
- `filter` (`documentTypes`, `sourcePattern`, `dateRange`)
- `include` (`metadata`, `summary`, `keywords`, `relevance`, `language`, `translation`)

Responses now include language metadata and, when requested, translated content so English-first assistants receive ready-to-use text.

### Development
```bash
npm run dev        # Start the MCP server with ts-node
npm run build      # Bundle via esbuild
npm run typecheck  # TypeScript type checking
npm run test       # Jest unit tests
npm run lint       # Biome linting
```

### License & contributions
- License: ISC
- Contributions: fork → branch → PR. Please include both English & Japanese context (or enable auto-translation) when updating docs.

---

## 日本語

### 概要
Shared Knowledge MCP Server は、複数のAIアシスタント（CLINE、Cursor、Windsurf、Claude Desktopなど）で共有できるナレッジベースをMCP経由で提供するRAGサーバーです。最新バージョンでは、英語利用者にも同等の体験を提供するため、ドキュメントと検索結果の両方が日英バイリンガルで利用できます。

### 特徴
- すべてのアシスタントから同じナレッジベースへアクセス可能。
- RAG +（Weaviate利用時）ハイブリッド検索で高精度な回答を提供。
- TypeScriptによる型安全な実装と明確なサービス分割。
- HNSWLib / Chroma / Pinecone / Milvus / Weaviate など複数のベクトルストアをサポート。
- Hugging Face Inference を利用した自動翻訳レイヤーで、検索結果を英語・日本語に自動翻訳。

### インストール
```bash
git clone https://github.com/yourusername/shared-knowledge-mcp.git
cd shared-knowledge-mcp
npm install
```

### 設定
各アシスタントの設定ファイルにMCPサーバーを追加します。以下は VS Code (CLINE / Cursor) の例です。

```json
{
  "mcpServers": {
    "shared-knowledge-base": {
      "command": "node",
      "args": ["/path/to/shared-knowledge-mcp/dist/index.js"],
      "env": {
        "KNOWLEDGE_BASE_PATH": "/path/to/your/rules",
        "OPENAI_API_KEY": "your-openai-api-key",
        "SIMILARITY_THRESHOLD": "0.7",
        "CHUNK_SIZE": "1000",
        "CHUNK_OVERLAP": "200",
        "VECTOR_STORE_TYPE": "hnswlib",
        "HUGGINGFACE_API_KEY": "your-huggingface-api-key",
        "DEFAULT_SOURCE_LANGUAGE": "ja",
        "DEFAULT_TARGET_LANGUAGE": "en"
      }
    }
  }
}
```

Pinecone / Weaviate / Milvus を利用する場合は、`VECTOR_STORE_TYPE` と `VECTOR_STORE_CONFIG` を変更してください。

#### 環境変数
| 変数 | 説明 | デフォルト |
| --- | --- | --- |
| `KNOWLEDGE_BASE_PATH` | 参照するドキュメントディレクトリ | 必須 |
| `OPENAI_API_KEY` | OpenAI埋め込みを利用（未設定ならOllama） | なし |
| `SIMILARITY_THRESHOLD` | 類似度スコアの閾値 (0–1) | `0.7` |
| `CHUNK_SIZE` | チャンクサイズ | `1000` |
| `CHUNK_OVERLAP` | チャンクの重なり | `200` |
| `VECTOR_STORE_TYPE` | 利用するベクトルストア | `hnswlib` |
| `VECTOR_STORE_CONFIG` | ベクトルストア設定(JSON文字列) | `{}` |
| `HUGGINGFACE_API_KEY` | 翻訳レイヤーを有効化 | なし |
| `DEFAULT_SOURCE_LANGUAGE` | ドキュメントの既定言語 | `ja` |
| `DEFAULT_TARGET_LANGUAGE` | `targetLanguage` 未指定時の翻訳先 | `en` |
| `TRANSLATION_MODEL` | 使用する翻訳モデルを上書き | 自動判定 |

### 多言語検索 / 翻訳
`HUGGINGFACE_API_KEY` を設定すると翻訳が有効になり、`rag_search` の `targetLanguage` （例: `"ja"`, `"en"`）に合わせて検索結果を翻訳します。レスポンスには以下の追加フィールドが含まれます。
- `language`: 検出した原文の言語
- `translatedContent`: 翻訳済みテキスト
- `translationLanguage`: 翻訳後の言語コード
- `translationProvider`: 使用した翻訳プロバイダー

出力が冗長な場合は、`include.language` や `include.translation` を `false` に設定して除外できます。

### ツールリファレンス
`rag_search` で利用可能な主なパラメータ:
- `query`（必須）
- `limit`
- `useHybridSearch` / `hybridAlpha`
- `context`
- `targetLanguage` / `sourceLanguage`
- `filter`（`documentTypes`, `sourcePattern`, `dateRange`）
- `include`（`metadata`, `summary`, `keywords`, `relevance`, `language`, `translation`）

検索結果はJSONで返され、必要に応じてサマリーや翻訳を追加できます。

### 開発
```bash
npm run dev        # 開発サーバー起動
npm run build      # 本番ビルド
npm run typecheck  # 型チェック
npm run test       # テスト実行
npm run lint       # Biome によるLint
```

### ライセンス / 貢献
- ライセンス: ISC
- 貢献手順: Fork → ブランチ作成 → 変更コミット → PR作成。
- ドキュメントを更新する場合は、可能な限り英語と日本語の両方を提供するか、翻訳レイヤーの設定方法を併記してください。
