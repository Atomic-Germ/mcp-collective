#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ListPromptsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { RagService } from './services/rag-service.js';
import type { SearchRequest, SearchResult, VectorStoreType } from './types/index.js';

// コンソール出力をstderrにリダイレクト
console.log = (...args) => {
  console.error(...args);
};
console.warn = (...args) => {
  console.error(...args);
};

// 環境変数から設定を取得
const KNOWLEDGE_BASE_PATH = process.env.KNOWLEDGE_BASE_PATH || '';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const SIMILARITY_THRESHOLD = Number.parseFloat(process.env.SIMILARITY_THRESHOLD || '0.5');
const CHUNK_SIZE = Number.parseInt(process.env.CHUNK_SIZE || '1000', 10);
const CHUNK_OVERLAP = Number.parseInt(process.env.CHUNK_OVERLAP || '200', 10);
const VECTOR_STORE_TYPE = (process.env.VECTOR_STORE_TYPE || 'hnswlib') as VectorStoreType;
const VECTOR_STORE_CONFIG = process.env.VECTOR_STORE_CONFIG 
  ? JSON.parse(process.env.VECTOR_STORE_CONFIG) 
  : {};
const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY || '';
const DEFAULT_SOURCE_LANGUAGE = process.env.DEFAULT_SOURCE_LANGUAGE || 'ja';
const DEFAULT_TARGET_LANGUAGE = process.env.DEFAULT_TARGET_LANGUAGE || 'en';
const TRANSLATION_MODEL = process.env.TRANSLATION_MODEL || '';

// 必須の環境変数をチェック
if (!KNOWLEDGE_BASE_PATH) {
  console.error('Error: KNOWLEDGE_BASE_PATH environment variable is required');
  process.exit(1);
}

// OpenAI APIキーが指定されていない場合は警告を表示
if (!OPENAI_API_KEY) {
  console.error('Warning: OPENAI_API_KEY environment variable is not set');
  console.error('Falling back to Ollama embeddings');
  console.error('To use OpenAI embeddings, set the OPENAI_API_KEY environment variable');
}

class KnowledgeBaseServer {
  private server: Server;
  private ragService: RagService;

  constructor() {
    // RAGサービスを初期化
    this.ragService = new RagService({
      knowledgeBasePath: KNOWLEDGE_BASE_PATH,
      similarityThreshold: SIMILARITY_THRESHOLD,
      chunkSize: CHUNK_SIZE,
      chunkOverlap: CHUNK_OVERLAP,
      vectorStoreType: VECTOR_STORE_TYPE,
      vectorStoreConfig: VECTOR_STORE_CONFIG,
      // OpenAI APIキーが指定されている場合はOpenAIを使用、そうでない場合はOllamaを使用
      embeddingType: OPENAI_API_KEY ? "openai" : "ollama",
      embeddingConfig: OPENAI_API_KEY 
        ? { openAIApiKey: OPENAI_API_KEY }
        : { ollamaModel: "llama3" },
      translationConfig: {
        enabled: Boolean(HUGGINGFACE_API_KEY),
        provider: HUGGINGFACE_API_KEY ? "huggingface" : undefined,
        apiKey: HUGGINGFACE_API_KEY || undefined,
        defaultSourceLanguage: DEFAULT_SOURCE_LANGUAGE,
        defaultTargetLanguage: DEFAULT_TARGET_LANGUAGE,
        model: TRANSLATION_MODEL || undefined,
      }
    });

    // MCPサーバーを初期化
    this.server = new Server(
      {
        name: 'shared-knowledge-base',
        version: '1.0.0',
      },
      {
        capabilities: {
          resources: {},
          tools: {},
          prompts: {},
        },
      }
    );

    this.setupHandlers();
  }

  private setupHandlers() {
    // ツールの一覧を定義
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'rag_search',
          description: 'ナレッジベースから情報を検索します / Search the shared knowledge base.',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: '検索クエリ / Query string',
              },
              limit: {
                type: 'number',
                description: '返す結果の最大数 / Maximum number of results to return',
                default: 10,
              },
              useHybridSearch: {
                type: 'boolean',
                description: 'ハイブリッド検索（ベクトル検索 + キーワード検索）を使用するか（Weaviateのみ） / Enable hybrid (vector + keyword) search (Weaviate only)',
                default: true,
              },
              hybridAlpha: {
                type: 'number',
                description: 'ハイブリッド検索の重み付け係数（0-1） / Weight for hybrid search (0 = keyword, 1 = vector)',
                default: 0.25,
              },
              context: {
                type: 'string',
                description: '検索コンテキスト / Optional search context',
              },
              targetLanguage: {
                type: 'string',
                description: '結果を翻訳するターゲット言語（例: "en"） / Target language for translations (e.g., "en")',
              },
              sourceLanguage: {
                type: 'string',
                description: '入力ドキュメントの既知の言語 / Known source language for the documents',
              },
              filter: {
                type: 'object',
                description: '追加のフィルタ条件 / Additional filtering options',
                properties: {
                  documentTypes: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'ドキュメントタイプでフィルタリング / Filter by document types',
                  },
                  sourcePattern: {
                    type: 'string',
                    description: 'ソースパスのパターン / Source path glob pattern',
                  },
                  dateRange: {
                    type: 'object',
                    properties: {
                      from: { type: 'string' },
                      to: { type: 'string' },
                    },
                  },
                },
              },
              include: {
                type: 'object',
                description: '結果に含めるオプション / Additional result payload options',
                properties: {
                  metadata: { type: 'boolean' },
                  summary: { type: 'boolean' },
                  keywords: { type: 'boolean' },
                  relevance: { type: 'boolean' },
                  language: { type: 'boolean' },
                  translation: { type: 'boolean' },
                },
              },
            },
            required: ['query'],
          },
        },
      ],
    }));

    // rag_searchツールの実装
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      if (request.params.name !== 'rag_search') {
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${request.params.name}`
        );
      }

      try {
        // パラメータの検証
        const args = request.params.arguments;
        if (!args || typeof args !== 'object') {
          throw new McpError(
            ErrorCode.InvalidParams,
            'Invalid arguments'
          );
        }

        const query = args.query;
        if (!query || typeof query !== 'string') {
          throw new McpError(
            ErrorCode.InvalidParams,
            'Query parameter is required and must be a string'
          );
        }

        const limit = typeof args.limit === 'number' ? args.limit : undefined;
        const useHybridSearch = typeof args.useHybridSearch === 'boolean' ? args.useHybridSearch : undefined;
        const hybridAlpha = typeof args.hybridAlpha === 'number' ? args.hybridAlpha : undefined;
        const context = typeof args.context === 'string' ? args.context : undefined;
        const targetLanguage = typeof args.targetLanguage === 'string' ? args.targetLanguage : undefined;
        const sourceLanguage = typeof args.sourceLanguage === 'string' ? args.sourceLanguage : undefined;
        const filter = this.normalizeFilter(args.filter);
        const include = this.normalizeInclude(args.include);
        
        const searchRequest: SearchRequest = {
          query,
          limit,
          useHybridSearch,
          hybridAlpha,
          context,
          targetLanguage,
          sourceLanguage,
          filter,
          include,
        };

        // RAG検索を実行
        console.error(`Executing RAG search for query: "${query}"`);
        
        try {
          // タイムアウト付きで検索を実行
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Search timed out')), 5000);
          });
          
          const searchPromise = this.ragService.search(searchRequest);
          
          // どちらか早い方を採用
          const results = await Promise.race([searchPromise, timeoutPromise]) as SearchResult[];
          
          // 結果が空の場合は、ダミーの結果を返す
          if (!results || results.length === 0) {
            console.error('No search results found, returning dummy results');
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(
                    {
                      results: [
                        {
                          content: "検索結果が見つかりませんでした。/ No matching documents were found.",
                          score: 0,
                          source: "dummy.md"
                        }
                      ],
                    },
                    null,
                    2
                  ),
                },
              ],
            };
          }
          
          console.error(`Found ${results.length} search results`);
          
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    results,
                  },
                  null,
                  2
                ),
              },
            ],
          };
        } catch (searchError) {
          console.error('Search error:', searchError);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    results: [
                      {
                        content: "検索中にエラーが発生しました。/ An error occurred during search.",
                        score: 0,
                        source: "error.md",
                        error: searchError instanceof Error ? searchError.message : String(searchError)
                      }
                    ],
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }
      } catch (error) {
        console.error('Error in rag_search:', error);
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    });

    // 利用可能なリソースの一覧（今回は空）
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => ({
      resources: [],
    }));

    // 利用可能なプロンプトの一覧（今回は空）
    this.server.setRequestHandler(ListPromptsRequestSchema, async () => ({
      prompts: [],
    }));

    // エラーハンドリング
    this.server.onerror = (error) => console.error('[MCP Error]', error);
  }

  private normalizeFilter(filterArg: unknown): SearchRequest["filter"] | undefined {
    if (!filterArg || typeof filterArg !== 'object') {
      return undefined;
    }

    const filter = filterArg as Record<string, unknown>;
    const normalized: NonNullable<SearchRequest["filter"]> = {};

    if (Array.isArray(filter.documentTypes)) {
      const documentTypes = filter.documentTypes.filter((value): value is string => typeof value === 'string');
      if (documentTypes.length > 0) {
        normalized.documentTypes = documentTypes;
      }
    }

    if (typeof filter.sourcePattern === 'string') {
      normalized.sourcePattern = filter.sourcePattern;
    }

    if (filter.dateRange && typeof filter.dateRange === 'object') {
      const dateRange = filter.dateRange as Record<string, unknown>;
      const from = typeof dateRange.from === 'string' ? dateRange.from : undefined;
      const to = typeof dateRange.to === 'string' ? dateRange.to : undefined;
      if (from || to) {
        normalized.dateRange = { from, to };
      }
    }

    if (
      (normalized.documentTypes && normalized.documentTypes.length > 0) ||
      normalized.sourcePattern ||
      (normalized.dateRange && (normalized.dateRange.from || normalized.dateRange.to))
    ) {
      return normalized;
    }

    return undefined;
  }

  private normalizeInclude(includeArg: unknown): SearchRequest["include"] | undefined {
    if (!includeArg || typeof includeArg !== 'object') {
      return undefined;
    }

    const include = includeArg as Record<string, unknown>;
    const normalized: NonNullable<SearchRequest["include"]> = {};
    const keys: (keyof NonNullable<SearchRequest["include"]>)[] = ['metadata', 'summary', 'keywords', 'relevance', 'language', 'translation'];

    for (const key of keys) {
      if (typeof include[key] === 'boolean') {
        normalized[key] = include[key] as boolean;
      }
    }

    if (Object.keys(normalized).length === 0) {
      return undefined;
    }

    return normalized;
  }

  async run() {
    try {
      // 起動時にベクトルストアを初期化
      console.error('Initializing RAG service...');
      const loaded = await this.ragService.loadExistingVectorStore();
      if (!loaded) {
        await this.ragService.initialize();
      }
      console.error('RAG service initialized');

      // MCPサーバーを起動
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      console.error('Knowledge Base MCP server running on stdio');

      process.on('SIGINT', async () => {
        await this.server.close();
        process.exit(0);
      });
    } catch (error) {
      console.error('Failed to initialize server:', error);
      process.exit(1);
    }
  }
}

// サーバーを起動
const server = new KnowledgeBaseServer();
server.run().catch(console.error);
