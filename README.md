# Unified RAG-enabled MCP Server

各種AIアシスタント（CLINE, Cursor, Windsurf, Claude Desktop）で共通して使用できるナレッジベースMCPサーバーです。
Retrieval Augmented Generation (RAG)を活用して、効率的な情報検索と利用を実現します。

## 特徴

- 複数のAIアシスタント間で共通のナレッジベースを使用可能
- RAGによる高精度な情報検索
- TypeScriptによる型安全な実装
- 複数のベクトルストア（HNSWLib, Chroma, Pinecone, Milvus）をサポート
- 抽象化されたインターフェースによる拡張性

## インストール

```bash
git clone https://github.com/yourusername/unify-rag.git
cd unify-rag
npm install
```

## 設定

MCPサーバーの設定は、各AIアシスタントの設定ファイルに追加します。

### VSCode (CLINE/Cursor用)

`~/Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json`:

```json
{
  "mcpServers": {
    "unified-knowledge": {
      "command": "node",
      "args": ["/path/to/unify-rag/dist/index.js"],
      "env": {
        "KNOWLEDGE_BASE_PATH": "/path/to/your/rules",
        "OPENAI_API_KEY": "your-openai-api-key",
        "SIMILARITY_THRESHOLD": "0.7",
        "CHUNK_SIZE": "1000",
        "CHUNK_OVERLAP": "200",
        "VECTOR_STORE_TYPE": "hnswlib"
      }
    }
  }
}
```

### Pineconeを使用する例

```json
{
  "mcpServers": {
    "unified-knowledge": {
      "command": "node",
      "args": ["/path/to/unify-rag/dist/index.js"],
      "env": {
        "KNOWLEDGE_BASE_PATH": "/path/to/your/rules",
        "OPENAI_API_KEY": "your-openai-api-key",
        "VECTOR_STORE_TYPE": "pinecone",
        "VECTOR_STORE_CONFIG": "{\"apiKey\":\"your-pinecone-api-key\",\"environment\":\"your-environment\",\"index\":\"your-index-name\"}"
      }
    }
  }
}
```

### Claude Desktop

`~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "unified-knowledge": {
      "command": "node",
      "args": ["/path/to/unify-rag/dist/index.js"],
      "env": {
        "KNOWLEDGE_BASE_PATH": "/path/to/your/rules",
        "OPENAI_API_KEY": "your-openai-api-key",
        "SIMILARITY_THRESHOLD": "0.7",
        "CHUNK_SIZE": "1000",
        "CHUNK_OVERLAP": "200"
      }
    }
  }
}
```

## 開発

### 開発用サーバーの起動

```bash
npm run dev
```

### ビルド

```bash
npm run build
```

### 本番環境での実行

```bash
npm start
```

## 使用可能なツール

### rag_search

ナレッジベースから情報を検索します。

#### 検索リクエスト

```typescript
interface SearchRequest {
  // 検索クエリ（必須）
  query: string;
  
  // 返す結果の最大数（デフォルト: 5）
  limit?: number;
  
  // 検索のコンテキスト（オプション）
  context?: string;
  
  // フィルタリングオプション（オプション）
  filter?: {
    // ドキュメントの種類でフィルタリング（例: ["markdown", "code"]）
    documentTypes?: string[];
    
    // ソースパスのパターンでフィルタリング（例: "*.md"）
    sourcePattern?: string;
  };
  
  // 結果に含める情報（オプション）
  include?: {
    metadata?: boolean;   // メタデータを含める
    summary?: boolean;    // 要約を生成
    keywords?: boolean;   // キーワードを抽出
    relevance?: boolean;  // 関連性の説明を生成
  };
}
```

#### 使用例

基本的な検索：
```typescript
const result = await callTool("rag_search", {
  query: "コミットメッセージのフォーマット",
  limit: 3
});
```

高度な検索：
```typescript
const result = await callTool("rag_search", {
  query: "コミットメッセージのフォーマット",
  context: "Gitの使い方について調査中",
  filter: {
    documentTypes: ["markdown"],
    sourcePattern: "git-*.md"
  },
  include: {
    summary: true,
    keywords: true,
    relevance: true
  }
});
```

#### 検索結果

```typescript
interface SearchResult {
  // 検索クエリに関連する文書の内容
  content: string;
  
  // 類似度スコア（0-1）
  score: number;
  
  // ソースファイルのパス
  source: string;
  
  // 位置情報
  startLine?: number;     // 開始行
  endLine?: number;       // 終了行
  startColumn?: number;   // 開始桁
  endColumn?: number;     // 終了桁
  
  // ドキュメントの種類（例: "markdown", "code", "text"）
  documentType?: string;
  
  // 追加情報（include オプションで指定した場合のみ）
  summary?: string;       // コンテンツの要約
  keywords?: string[];    // 関連キーワード
  relevance?: string;     // 関連性の説明
  metadata?: Record<string, unknown>; // メタデータ
}
```

#### レスポンス例

```json
{
  "results": [
    {
      "content": "# コミットメッセージのフォーマット\n\n以下の形式でコミットメッセージを記述してください：\n\n```\n<type>(<scope>): <subject>\n\n<body>\n\n<footer>\n```\n\n...",
      "score": 0.92,
      "source": "/path/to/rules/git-conventions.md",
      "startLine": 1,
      "endLine": 10,
      "startColumn": 1,
      "endColumn": 35,
      "documentType": "markdown",
      "summary": "コミットメッセージのフォーマットについての説明文書",
      "keywords": ["commit", "message", "format", "type", "scope"],
      "relevance": "このドキュメントは検索クエリ \"コミットメッセージのフォーマット\" に関連する情報を含んでいます。類似度スコア: 0.92"
    }
  ]
}
```

これらの拡張された検索機能により、LLMはより正確かつ効率的に情報を処理できるようになります。位置情報、ドキュメントタイプ、要約、キーワードなどの追加情報は、LLMが検索結果をより深く理解し、適切に活用するのに役立ちます。

## 仕組み

1. 起動時に指定されたディレクトリ内のMarkdownファイル（.md, .mdx）とテキストファイル（.txt）を読み込みます
2. ドキュメントをチャンクに分割し、OpenAI APIを使用してベクトル化します
3. 選択したベクトルストア（デフォルト: HNSWLib）を使用してベクトルインデックスを作成します
4. 検索クエリに対して類似度の高いドキュメントを返します

### サポートされているベクトルストア

- **HNSWLib**: ローカルファイルシステムに保存される高速なベクトルストア（デフォルト）
- **Chroma**: オープンソースのベクトルデータベース
- **Pinecone**: マネージドベクトルデータベースサービス（API キーが必要）
- **Milvus**: 大規模なベクトル検索エンジン

各ベクトルストアは抽象化されたインターフェースを通じて利用され、必要に応じて簡単に切り替えることができます。

## 設定オプション

| 環境変数 | 説明 | デフォルト値 |
|----------|------|--------------|
| KNOWLEDGE_BASE_PATH | ナレッジベースのパス（必須） | - |
| OPENAI_API_KEY | OpenAI API キー（必須） | - |
| SIMILARITY_THRESHOLD | 検索時の類似度スコアの閾値（0-1） | 0.7 |
| CHUNK_SIZE | テキスト分割時のチャンクサイズ | 1000 |
| CHUNK_OVERLAP | チャンクのオーバーラップサイズ | 200 |
| VECTOR_STORE_TYPE | 使用するベクトルストアの種類（"hnswlib", "chroma", "pinecone", "milvus"） | "hnswlib" |
| VECTOR_STORE_CONFIG | ベクトルストアの設定（JSON文字列） | {} |

## ライセンス

ISC

## 貢献

1. Forkする
2. フィーチャーブランチを作成する (`git checkout -b feature/amazing-feature`)
3. 変更をコミットする (`git commit -m 'Add some amazing feature'`)
4. ブランチにプッシュする (`git push origin feature/amazing-feature`)
5. Pull Requestを作成する
