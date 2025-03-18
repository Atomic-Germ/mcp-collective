import { HNSWLib } from "@langchain/community/vectorstores/hnswlib";
import { Chroma } from "@langchain/community/vectorstores/chroma";
import { PineconeStore } from "@langchain/community/vectorstores/pinecone";
import type { Document } from "@langchain/core/documents";
import type { Embeddings } from "@langchain/core/embeddings";
import type { VectorStoreType } from "../types/index.js";

/**
 * 指定された種類のベクトルストアを作成
 * @param type ベクトルストアの種類
 * @param docs ドキュメント
 * @param embeddings 埋め込みモデル
 * @param config 設定
 * @returns ベクトルストア
 */
export async function createVectorStore(
  type: VectorStoreType,
  docs: Document[],
  embeddings: Embeddings,
  config?: Record<string, unknown>
) {
  switch (type) {
    case "hnswlib":
      return await HNSWLib.fromDocuments(docs, embeddings, config);
    case "chroma":
      return await Chroma.fromDocuments(docs, embeddings, {
        collectionName: "default",
        ...(config as Record<string, unknown>),
      });
    case "pinecone":
      if (!config || typeof config !== "object") {
        throw new Error("Pinecone requires configuration with pineconeIndex");
      }
      // Pineconeの場合は、pineconeIndexが必要
      if (!("pineconeIndex" in config)) {
        throw new Error("Pinecone configuration must include pineconeIndex");
      }
      // 型アサーションを使用して、Pineconeの型要件を満たす
      {
        interface PineconeConfig {
          pineconeIndex: unknown;
          [key: string]: unknown;
        }
        return await PineconeStore.fromDocuments(docs, embeddings, config as unknown as PineconeConfig);
      }
    case "milvus":
      throw new Error("Milvus is not supported in this build. Please install @zilliz/milvus2-sdk-node package.");
    default:
      throw new Error(`Unsupported vector store type: ${type}`);
  }
}

/**
 * 指定された種類のベクトルストアをロード
 * @param type ベクトルストアの種類
 * @param directory ロード元ディレクトリ
 * @param embeddings 埋め込みモデル
 * @returns ベクトルストア
 */
export async function loadVectorStore(
  type: VectorStoreType,
  directory: string,
  embeddings: Embeddings
) {
  switch (type) {
    case "hnswlib":
      return await HNSWLib.load(directory, embeddings);
    case "chroma":
      // Chromaはloadメソッドを持たないため、新しいインスタンスを作成
      return new Chroma(embeddings, { collectionName: directory });
    // Pineconeはディレクトリからのロードをサポートしていないため、別の方法が必要
    case "pinecone":
      throw new Error("Loading from directory is not supported for Pinecone");
    case "milvus":
      throw new Error("Loading from directory is not supported for Milvus");
    default:
      throw new Error(`Unsupported vector store type: ${type}`);
  }
}
