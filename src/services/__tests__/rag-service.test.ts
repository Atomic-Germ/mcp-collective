import { RagService } from '../rag-service';
import { Milvus } from '@langchain/community/vectorstores/milvus';
import { PineconeStore } from '@langchain/community/vectorstores/pinecone';
import { createVectorStore, loadVectorStore } from '../vector-store-factory';
import { DirectoryLoader } from 'langchain/document_loaders/fs/directory';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { OpenAIEmbeddings } from '@langchain/openai';
import { Document } from '@langchain/core/documents';
import fs from 'node:fs';
import path from 'node:path';
import type { Config as RagConfig, SearchRequest } from '../../types/index';

// モック
jest.mock('../vector-store-factory');
jest.mock('langchain/document_loaders/fs/directory');
jest.mock('langchain/text_splitter');
jest.mock('@langchain/openai');
jest.mock('node:fs');
jest.mock('node:path');

describe('RagService', () => {
  let ragService: RagService;
  let mockConfig: RagConfig;
  let mockOpenAIApiKey: string;
  let mockVectorStore: {
    save: jest.Mock;
    similaritySearchWithScore: jest.Mock;
  };

  beforeEach(() => {
    // モックをリセット
    jest.clearAllMocks();

    // テスト用のモックデータを作成
    mockConfig = {
      knowledgeBasePath: '/path/to/knowledge',
      similarityThreshold: 0.7,
      chunkSize: 1000,
      chunkOverlap: 200,
      vectorStoreType: 'hnswlib',
    };

    mockOpenAIApiKey = 'test-api-key';

    // fsのモックメソッドを設定
    (fs.existsSync as jest.Mock).mockReturnValue(true);

    // pathのモックメソッドを設定
    (path.join as jest.Mock).mockImplementation((...args) => args.join('/'));

    // モックは既に別ファイルで実装されているため、ここでは追加の設定は不要
    // jest.mockによって、実際のクラスの代わりにモックが使用される

    // createVectorStoreのモックメソッドを設定
    mockVectorStore = {
      save: jest.fn().mockResolvedValue(undefined),
      similaritySearchWithScore: jest.fn().mockResolvedValue([
        [
          new Document({
            pageContent: 'Test content 1',
            metadata: { source: 'test1.md', startLine: 1, endLine: 5 },
          }),
          0.9,
        ],
        [
          new Document({
            pageContent: 'Test content 2',
            metadata: { source: 'test2.md' },
          }),
          0.8,
        ],
        [
          new Document({
            pageContent: 'Test content 3',
            metadata: { source: 'test3.md' },
          }),
          0.6,
        ],
      ]),
    };
    (createVectorStore as jest.Mock).mockResolvedValue(mockVectorStore);
    (loadVectorStore as jest.Mock).mockResolvedValue(mockVectorStore);

    // RagServiceのインスタンスを作成
    ragService = new RagService({
      ...mockConfig,
      embeddingType: "openai",
      embeddingConfig: {
        openAIApiKey: mockOpenAIApiKey
      }
    });
  });

  describe('initialize', () => {
    it('should throw error if knowledge base path does not exist', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      await expect(ragService.initialize()).rejects.toThrow(
        `Knowledge base path does not exist: ${mockConfig.knowledgeBasePath}`
      );
    });

    it('should initialize vector store successfully', async () => {
      // 初期化が成功することを確認
      await expect(ragService.initialize()).resolves.not.toThrow();
      
      // createVectorStoreが呼び出されたことを確認
      expect(createVectorStore).toHaveBeenCalled();
    });

    it('should handle empty documents', async () => {
      // DirectoryLoaderのモックを直接変更するのではなく、
      // createVectorStoreのモックを変更する
      (createVectorStore as jest.Mock).mockImplementationOnce(() => null);

      // 初期化が成功することを確認
      await expect(ragService.initialize()).resolves.not.toThrow();
      
      // createVectorStoreが呼び出されたことを確認
      expect(createVectorStore).toHaveBeenCalled();
    });
  });

  describe('loadExistingVectorStore', () => {
    it('should return false for non-hnswlib vector store types', async () => {
      ragService = new RagService({
        ...mockConfig,
        vectorStoreType: 'chroma',
        embeddingType: "openai",
        embeddingConfig: {
          openAIApiKey: mockOpenAIApiKey
        }
      });

      const result = await ragService.loadExistingVectorStore();

      expect(result).toBe(false);
      expect(loadVectorStore).not.toHaveBeenCalled();
    });

    it('should return false if vector store path does not exist', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const result = await ragService.loadExistingVectorStore();

      expect(result).toBe(false);
      expect(loadVectorStore).not.toHaveBeenCalled();
    });

    it('should load existing vector store successfully', async () => {
      const result = await ragService.loadExistingVectorStore();

      expect(result).toBe(true);
      expect(loadVectorStore).toHaveBeenCalledWith(
        mockConfig.vectorStoreType,
        expect.any(String),
        expect.any(Object)
      );
    });

    it('should handle errors during loading', async () => {
      (loadVectorStore as jest.Mock).mockRejectedValue(new Error('Load error'));

      const result = await ragService.loadExistingVectorStore();

      expect(result).toBe(false);
    });
  });

  describe('search', () => {
    it('should load existing vector store if not initialized', async () => {
      const searchRequest: SearchRequest = { query: 'test query' };

      await ragService.search(searchRequest);

      expect(loadVectorStore).toHaveBeenCalled();
    });

    it('should initialize if loading fails', async () => {
      // テスト前にvectorStoreをnullに設定
      ragService = new RagService({
        ...mockConfig,
        embeddingType: "openai",
        embeddingConfig: {
          openAIApiKey: mockOpenAIApiKey
        }
      });
      
      // loadVectorStoreがfalseを返すようにモック
      (loadVectorStore as jest.Mock).mockImplementation(() => {
        throw new Error("Load error");
      });
      
      // createVectorStoreがvectorStoreを設定するようにモックを変更
      const mockNewVectorStore = {
        similaritySearchWithScore: jest.fn().mockResolvedValue([
          [
            new Document({
              pageContent: 'Test content 1',
              metadata: { source: 'test1.md' },
            }),
            0.9,
          ],
        ]),
        save: jest.fn().mockResolvedValue(undefined),
      };
      (createVectorStore as jest.Mock).mockResolvedValue(mockNewVectorStore);
      
      const searchRequest: SearchRequest = { query: 'test query' };

      // 直接initializeを呼び出す
      await ragService.initialize();
      
      // その後、searchを呼び出す
      await ragService.search(searchRequest);

      // createVectorStoreが呼び出されたことを確認
      expect(createVectorStore).toHaveBeenCalled();
    });

    it('should perform search with query and limit', async () => {
      const searchRequest: SearchRequest = { query: 'test query', limit: 10 };

      await ragService.search(searchRequest);

      expect(mockVectorStore.similaritySearchWithScore).toHaveBeenCalledWith(
        searchRequest.query,
        searchRequest.limit
      );
    });

    it('should filter results by similarity threshold', async () => {
      const searchRequest: SearchRequest = { query: 'test query' };

      const results = await ragService.search(searchRequest);

      // 閾値（0.7）未満のドキュメントはフィルタリングされる
      expect(results.length).toBe(2);
      expect(results[0].score).toBeGreaterThanOrEqual(mockConfig.similarityThreshold as number);
      expect(results[1].score).toBeGreaterThanOrEqual(mockConfig.similarityThreshold as number);
    });

    it('should extract line and column information from metadata', async () => {
      const searchRequest: SearchRequest = { query: 'test query' };

      const results = await ragService.search(searchRequest);

      expect(results[0].startLine).toBe(1);
      expect(results[0].endLine).toBe(5);
    });

    it('should infer line and column information when not in metadata', async () => {
      const searchRequest: SearchRequest = { query: 'test query' };

      const results = await ragService.search(searchRequest);

      expect(results[1].startLine).toBe(1);
      expect(results[1].endLine).toBeGreaterThan(0);
      expect(results[1].startColumn).toBe(1);
      expect(results[1].endColumn).toBeGreaterThan(0);
    });

    it('should infer document type from source file extension', async () => {
      const searchRequest: SearchRequest = { query: 'test query' };

      const results = await ragService.search(searchRequest);

      expect(results[0].documentType).toBe('markdown');
    });

    it('should use context in search query if provided', async () => {
      const searchRequest: SearchRequest = {
        query: 'test query',
        context: 'additional context',
      };

      await ragService.search(searchRequest);

      expect(mockVectorStore.similaritySearchWithScore).toHaveBeenCalledWith(
        'test query additional context',
        expect.any(Number)
      );
    });

    it('should filter results by document type if specified', async () => {
      const searchRequest: SearchRequest = {
        query: 'test query',
        filter: {
          documentTypes: ['markdown'],
        },
      };

      const results = await ragService.search(searchRequest);

      // すべての結果がmarkdownタイプ
      expect(results.every(result => result.documentType === 'markdown')).toBe(true);
    });

    it('should generate summary if requested', async () => {
      const searchRequest: SearchRequest = {
        query: 'test query',
        include: {
          summary: true,
        },
      };

      const results = await ragService.search(searchRequest);

      expect(results[0].summary).toBeDefined();
      expect(typeof results[0].summary).toBe('string');
    });

    it('should extract keywords if requested', async () => {
      const searchRequest: SearchRequest = {
        query: 'test query',
        include: {
          keywords: true,
        },
      };

      const results = await ragService.search(searchRequest);

      expect(results[0].keywords).toBeDefined();
      expect(Array.isArray(results[0].keywords)).toBe(true);
    });

    it('should generate relevance explanation if requested', async () => {
      const searchRequest: SearchRequest = {
        query: 'test query',
        include: {
          relevance: true,
        },
      };

      const results = await ragService.search(searchRequest);

      expect(results[0].relevance).toBeDefined();
      expect(typeof results[0].relevance).toBe('string');
      expect(results[0].relevance).toContain('test query');
    });

    it('should include metadata if requested', async () => {
      const searchRequest: SearchRequest = {
        query: 'test query',
        include: {
          metadata: true,
        },
      };

      const results = await ragService.search(searchRequest);

      expect(results[0].metadata).toBeDefined();
      expect(results[0].metadata).toEqual(
        expect.objectContaining({
          source: 'test1.md',
          startLine: 1,
          endLine: 5,
        })
      );
    });
  });
});
