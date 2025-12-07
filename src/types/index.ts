import type { EmbeddingType } from "../services/embeddings-factory.js";

export interface Config {
  /**
   * ナレッジベースのパス
   * `docs/`など
   */
  knowledgeBasePath: string;
  
  /**
   * 検索時の類似度スコアの閾値（0-1）
   * デフォルト: 0.7
   */
  similarityThreshold?: number;
  
  /**
   * チャンクサイズ
   * デフォルト: 1000
   */
  chunkSize?: number;
  
  /**
   * チャンクのオーバーラップサイズ
   * デフォルト: 200
   */
  chunkOverlap?: number;

  /**
   * 使用するベクトルストアの種類
   * デフォルト: "hnswlib"
   */
  vectorStoreType?: VectorStoreType;

  /**
   * ベクトルストアの設定
   */
  vectorStoreConfig?: Record<string, unknown>;
  
  /**
   * 使用する埋め込みモデルの種類
   * デフォルト: "local"
   */
  embeddingType?: EmbeddingType;
  
  /**
   * 埋め込みモデルの設定
   */
  embeddingConfig?: Record<string, unknown>;

  /**
   * 翻訳設定
   */
  translationConfig?: TranslationConfig;
}

export interface TranslationConfig {
  /**
   * 翻訳機能を有効化するかどうか
   */
  enabled?: boolean;

  /**
   * 翻訳プロバイダー
   */
  provider?: "huggingface";

  /**
   * プロバイダーごとのAPIキー
   */
  apiKey?: string;

  /**
   * デフォルトのソース言語（例: "ja"）
   */
  defaultSourceLanguage?: string;

  /**
   * デフォルトのターゲット言語（例: "en"）
   */
  defaultTargetLanguage?: string;

  /**
   * 使用するモデル名
   */
  model?: string;
}

/**
 * サポートされているベクトルストアの種類
 */
export type VectorStoreType = "hnswlib" | "chroma" | "pinecone" | "milvus" | "weaviate";

import type { Document } from "@langchain/core/documents";
import type { Embeddings } from "@langchain/core/embeddings";

/**
 * ベクトルストアの抽象インターフェース
 * 実際の実装はLangChainのベクトルストアクラスを使用
 */
export interface VectorStore {
  /**
   * 類似度検索を実行
   * @param query 検索クエリ
   * @param k 取得する結果の数
   */
  similaritySearchWithScore(query: string, k: number): Promise<[Document, number][]>;
}

/**
 * 検索結果のインターフェース
 * LLMが処理しやすい形式で情報を提供
 */
export interface SearchResult {
  /**
   * 検索クエリに関連する文書の内容
   */
  content: string;
  
  /**
   * 類似度スコア（0-1）
   */
  score: number;
  
  /**
   * ソースファイルのパス
   */
  source: string;

  /**
   * 開始行番号（オプション）
   * LLMが処理しやすくするための情報
   */
  startLine?: number;
  
  /**
   * 終了行番号（オプション）
   * LLMが処理しやすくするための情報
   */
  endLine?: number;
  
  /**
   * 開始桁番号（オプション）
   * LLMが処理しやすくするための情報
   */
  startColumn?: number;
  
  /**
   * 終了桁番号（オプション）
   * LLMが処理しやすくするための情報
   */
  endColumn?: number;

  /**
   * ドキュメントの種類（オプション）
   * 例: "markdown", "text", "code", "json" など
   */
  documentType?: string;

  /**
   * コンテンツの要約（オプション）
   * LLMが生成した内容の簡潔な要約
   */
  summary?: string;

  /**
   * 関連キーワード（オプション）
   * 検索結果に関連するキーワードのリスト
   */
  keywords?: string[];

  /**
   * 関連性の説明（オプション）
   * なぜこの結果が検索クエリに関連しているかの説明
   */
  relevance?: string;

  /**
   * メタデータ（オプション）
   * ドキュメントに関する追加情報
   */
  metadata?: Record<string, unknown>;

  /**
   * ドキュメントの推定言語（例: "ja", "en"）
   */
  language?: string;

  /**
   * 翻訳済みコンテンツ
   */
  translatedContent?: string;

  /**
   * 翻訳後の言語
   */
  translationLanguage?: string;

  /**
   * 翻訳プロバイダー
   */
  translationProvider?: string;
}

/**
 * 検索リクエストのインターフェース
 * LLMが処理しやすい形式でリクエストを構築
 */
export interface SearchRequest {
  /**
   * 検索クエリ
   */
  query: string;
  
  /**
   * 返す結果の最大数
   * デフォルト: 5
   */
  limit?: number;

  /**
   * ハイブリッド検索を使用するかどうか
   * Weaviateベクトルストアでのみ有効
   * デフォルト: false
   */
  useHybridSearch?: boolean;

  /**
   * ハイブリッド検索の重み付け係数（0-1）
   * 0に近いほどキーワード検索（BM25）の重みが大きく、
   * 1に近いほどベクトル検索の重みが大きくなる
   * デフォルト: 0.5（均等）
   */
  hybridAlpha?: number;

  /**
   * 検索のコンテキスト（オプション）
   * 検索をより適切に行うための追加情報
   */
  context?: string;

  /**
   * 結果を指定した言語に翻訳する
   */
  targetLanguage?: string;

  /**
   * 入力ドキュメントの既知の言語
   */
  sourceLanguage?: string;

  /**
   * フィルタリングオプション（オプション）
   * 特定の条件に基づいて結果をフィルタリング
   */
  filter?: {
    /**
     * ドキュメントの種類でフィルタリング
     * 例: ["markdown", "code"]
     */
    documentTypes?: string[];
    
    /**
     * ソースパスのパターンでフィルタリング
     * 例: "*.md", "docs/*.txt"
     */
    sourcePattern?: string;
    
    /**
     * 日付範囲でフィルタリング
     */
    dateRange?: {
      from?: string;
      to?: string;
    };
  };

  /**
   * 結果に含める情報（オプション）
   */
  include?: {
    /**
     * メタデータを含めるかどうか
     * デフォルト: false
     */
    metadata?: boolean;
    
    /**
     * 要約を生成するかどうか
     * デフォルト: false
     */
    summary?: boolean;
    
    /**
     * キーワードを抽出するかどうか
     * デフォルト: false
     */
    keywords?: boolean;
    
    /**
     * 関連性の説明を生成するかどうか
     * デフォルト: false
     */
    relevance?: boolean;

    /**
     * 結果の言語メタデータを含める
     */
    language?: boolean;

    /**
     * 翻訳済みコンテンツを含める
     */
    translation?: boolean;
  };
}
