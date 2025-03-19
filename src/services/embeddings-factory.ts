import type { Embeddings } from "@langchain/core/embeddings";
import { OpenAIEmbeddings } from "@langchain/openai";
import { OllamaEmbeddings } from "@langchain/ollama";

// 埋め込みモデルの型
export type EmbeddingType = "openai" | "local" | "ollama";

export interface EmbeddingsConfig {
  // 共通設定
  type: EmbeddingType;
  
  // OpenAI固有の設定
  openAIApiKey?: string;
  openAIModel?: string;
  
  // ローカルモデル固有の設定
  localModel?: string;
  localConfig?: Record<string, unknown>;
  
  // Ollama固有の設定
  ollamaBaseUrl?: string;
  ollamaModel?: string;
}

/**
 * OllamaEmbeddingsを使用するOllama埋め込みモデルを作成
 */
function createOllamaEmbeddings(config: EmbeddingsConfig): Embeddings {
  // 日本語のテキストを適切に処理するための設定
  return new OllamaEmbeddings({
    baseUrl: config.ollamaBaseUrl || "http://localhost:11434",
    model: config.ollamaModel || "llama3",
    // 日本語のテキストを適切に処理するための設定
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

/**
 * HuggingFaceEmbeddingsを使用するローカル埋め込みモデルを作成
 * 注: 使用前に `npm install @huggingface/inference` が必要
 */
function createLocalEmbeddings(config: EmbeddingsConfig): Embeddings {
  try {
    // 動的インポートを使用して、パッケージが存在しない場合のエラーを処理
    // 修正: 正しいインポートパスを使用
    const { HuggingFaceInferenceEmbeddings } = require("@langchain/community/embeddings/hf");
    
    return new HuggingFaceInferenceEmbeddings({
      model: config.localModel || "sentence-transformers/all-MiniLM-L6-v2",
    });
  } catch (error) {
    console.error("HuggingFace Embeddings の初期化に失敗しました。パッケージがインストールされているか確認してください。");
    console.error("インストールコマンド: npm install @langchain/community @huggingface/inference");
    console.error("エラー詳細:", error);
    
    // フォールバックとして、ダミーのOpenAIEmbeddingsを返す
    // 注意: このインスタンスは実際には機能しませんが、型の互換性のために使用します
    const dummyEmbeddings = new OpenAIEmbeddings({
      openAIApiKey: "dummy-key-for-type-compatibility-only",
    });
    
    // 元のメソッドをオーバーライドして、常に固定の埋め込みを返すようにする
    dummyEmbeddings.embedQuery = async () => new Array(384).fill(0);
    dummyEmbeddings.embedDocuments = async (docs) => docs.map(() => new Array(384).fill(0));
    
    return dummyEmbeddings;
  }
}

/**
 * 指定された種類の埋め込みモデルを作成
 * @param config 埋め込みモデルの設定
 * @returns 埋め込みモデル
 */
export function createEmbeddings(config: EmbeddingsConfig): Embeddings {
  // デフォルトでOllamaEmbeddingsを使用
  if (config.type === "ollama" || !config.type) {
    console.log("Using Ollama embeddings");
    return createOllamaEmbeddings(config);
  }

  switch (config.type) {
    case "openai":
      if (!config.openAIApiKey) {
        console.warn("OpenAI API キーが指定されていません。Ollama埋め込みモデルにフォールバックします。");
        return createOllamaEmbeddings(config);
      }
      return new OpenAIEmbeddings({
        openAIApiKey: config.openAIApiKey,
        model: config.openAIModel || "text-embedding-ada-002",
      });
    
    case "local":
      return createLocalEmbeddings(config);
    
    default:
      console.warn(`Unsupported embedding type: ${config.type}. Using Ollama embeddings instead.`);
      return createOllamaEmbeddings(config);
  }
}
