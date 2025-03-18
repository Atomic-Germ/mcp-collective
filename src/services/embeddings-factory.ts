import type { Embeddings } from "@langchain/core/embeddings";
import { OpenAIEmbeddings } from "@langchain/openai";

// 埋め込みモデルの型
export type EmbeddingType = "openai" | "local";

export interface EmbeddingsConfig {
  // 共通設定
  type: EmbeddingType;
  
  // OpenAI固有の設定
  openAIApiKey?: string;
  openAIModel?: string;
  
  // ローカルモデル固有の設定
  localModel?: string;
  localConfig?: Record<string, unknown>;
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
  switch (config.type) {
    case "openai":
      if (!config.openAIApiKey) {
        console.warn("OpenAI API キーが指定されていません。ローカル埋め込みモデルにフォールバックします。");
        return createLocalEmbeddings(config);
      }
      return new OpenAIEmbeddings({
        openAIApiKey: config.openAIApiKey,
        model: config.openAIModel || "text-embedding-ada-002",
      });
    
    case "local":
      return createLocalEmbeddings(config);
    
    default:
      throw new Error(`Unsupported embedding type: ${config.type}`);
  }
}
