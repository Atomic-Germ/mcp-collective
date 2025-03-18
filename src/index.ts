#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { RagService } from './services/rag-service.js';
import type { SearchRequest, VectorStoreType } from './types/index.js';

// コンソール出力をstderrにリダイレクト
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;
console.log = (...args) => {
  console.error(...args);
};
console.warn = (...args) => {
  console.error(...args);
};

// 環境変数から設定を取得
const KNOWLEDGE_BASE_PATH = process.env.KNOWLEDGE_BASE_PATH || '';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const SIMILARITY_THRESHOLD = Number.parseFloat(process.env.SIMILARITY_THRESHOLD || '0.7');
const CHUNK_SIZE = Number.parseInt(process.env.CHUNK_SIZE || '1000', 10);
const CHUNK_OVERLAP = Number.parseInt(process.env.CHUNK_OVERLAP || '200', 10);
const VECTOR_STORE_TYPE = (process.env.VECTOR_STORE_TYPE || 'hnswlib') as VectorStoreType;
const VECTOR_STORE_CONFIG = process.env.VECTOR_STORE_CONFIG 
  ? JSON.parse(process.env.VECTOR_STORE_CONFIG) 
  : {};

// 必須の環境変数をチェック
if (!KNOWLEDGE_BASE_PATH) {
  console.error('Error: KNOWLEDGE_BASE_PATH environment variable is required');
  process.exit(1);
}

// OpenAI APIキーが指定されていない場合は警告を表示
if (!OPENAI_API_KEY) {
  console.error('Warning: OPENAI_API_KEY environment variable is not set');
  console.error('Falling back to local embeddings (HuggingFace)');
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
      // OpenAI APIキーが指定されている場合はOpenAIを使用、そうでない場合はローカルモデルを使用
      embeddingType: OPENAI_API_KEY ? "openai" : "local",
      embeddingConfig: OPENAI_API_KEY 
        ? { openAIApiKey: OPENAI_API_KEY }
        : { localModel: "sentence-transformers/all-MiniLM-L6-v2" }
    });

    // MCPサーバーを初期化
    this.server = new Server(
      {
        name: 'unified-knowledge-base',
        version: '0.1.0',
      },
      {
        capabilities: {
          resources: {},
          tools: {},
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
          description: 'ナレッジベースから情報を検索します',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: '検索クエリ',
              },
              limit: {
                type: 'number',
                description: '返す結果の最大数',
                default: 5,
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
        
        const searchRequest: SearchRequest = {
          query,
          limit,
        };

        // RAG検索を実行
        const results = await this.ragService.search(searchRequest);

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

    // エラーハンドリング
    this.server.onerror = (error) => console.error('[MCP Error]', error);
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
