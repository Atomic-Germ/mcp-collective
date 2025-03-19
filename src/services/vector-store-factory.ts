import { HNSWLib } from "@langchain/community/vectorstores/hnswlib";
import { Chroma } from "@langchain/community/vectorstores/chroma";
import { PineconeStore } from "@langchain/community/vectorstores/pinecone";
import { WeaviateStore } from "@langchain/weaviate";
import weaviate from "weaviate-ts-client";
import type { WeaviateClient } from "weaviate-ts-client";
import type { Document } from "@langchain/core/documents";
import type { Embeddings } from "@langchain/core/embeddings";
import type { VectorStoreType } from "../types/index.js";
import * as fs from "node:fs";
import * as path from "node:path";

/**
 * Weaviate用の設定インターフェース
 */
export interface WeaviateConfig {
  url: string;
  className: string;
  textKey: string;
  apiKey?: string;
}

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
    case "weaviate": {
      // Weaviateの設定を取得
      const weaviateConfig = config || {};
      
      const url = (weaviateConfig.url as string) || "http://localhost:8080";
      const className = (weaviateConfig.className as string) || "Document";
      const textKey = (weaviateConfig.textKey as string) || "content";
      const apiKey = weaviateConfig.apiKey as string | undefined;
      
      // Weaviateクライアントを作成
      const client = weaviate.client({
        scheme: new URL(url).protocol.replace(":", ""),
        host: new URL(url).host,
      });
      
      // スキーマが存在するか確認し、存在しない場合は作成
      await ensureWeaviateSchema(client, className, textKey);
      
      // WeaviateStoreを作成
      return await WeaviateStore.fromDocuments(docs, embeddings, {
        client,
        indexName: className,
        textKey: textKey,
        metadataKeys: ["source", "startLine", "endLine", "documentType"],
      });
    }
    case "milvus":
      throw new Error("Milvus is not supported in this build. Please install @zilliz/milvus2-sdk-node package.");
    default:
      throw new Error(`Unsupported vector store type: ${type}`);
  }
}

/**
 * Weaviateスキーマを確認し、存在しない場合は作成する
 * @param client Weaviateクライアント
 * @param className クラス名
 * @param textKey テキストキー
 */
async function ensureWeaviateSchema(client: WeaviateClient, className: string, textKey: string) {
  try {
    // スキーマが存在するか確認
    const schema = await client.schema.getter().do();
    const classExists = schema.classes?.some(c => c.class === className);
    
    if (!classExists) {
      // スキーマが存在しない場合は作成
      await client.schema.classCreator().withClass({
        class: className,
        vectorizer: "none",  // 外部埋め込みを使用
        vectorIndexType: "hnsw", // デフォルトのベクトルインデックスタイプ
        properties: [
          {
            name: textKey,
            dataType: ["text"],
            indexFilterable: true,
            indexSearchable: true,
            tokenization: "field",  // 日本語のテキストを適切に処理するために、フィールド全体を一つのトークンとして扱う
          },
          {
            name: "source",
            dataType: ["text"],
            indexFilterable: true,
            indexSearchable: true,
          },
          {
            name: "startLine",
            dataType: ["int"],
            indexFilterable: true,
          },
          {
            name: "endLine",
            dataType: ["int"],
            indexFilterable: true,
          },
          {
            name: "documentType",
            dataType: ["text"],
            indexFilterable: true,
            indexSearchable: true,
          }
        ],
      }).do();
      
      console.log(`Created Weaviate schema for class: ${className}`);
    } else {
      console.log(`Weaviate schema for class ${className} already exists`);
    }
  } catch (error) {
    console.error("Error ensuring Weaviate schema:", error);
    throw error;
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
  embeddings: Embeddings,
  config?: Record<string, unknown>
) {
  switch (type) {
    case "hnswlib":
      return await HNSWLib.load(directory, embeddings);
    case "chroma":
      // Chromaはloadメソッドを持たないため、新しいインスタンスを作成
      return new Chroma(embeddings, { collectionName: directory });
    case "weaviate": {
      // Weaviateの設定を取得
      const weaviateConfig = config || {};
      
      const url = (weaviateConfig.url as string) || "http://localhost:8080";
      const className = (weaviateConfig.className as string) || "Document";
      const textKey = (weaviateConfig.textKey as string) || "content";
      
      // Weaviateクライアントを作成
      const client = weaviate.client({
        scheme: new URL(url).protocol.replace(":", ""),
        host: new URL(url).host,
      });
      
      // クラスが存在するか確認
      const schema = await client.schema.getter().do();
      const classExists = schema.classes?.some(c => c.class === className);
      if (!classExists) {
        throw new Error(`Weaviate class ${className} does not exist`);
      }
      
      // WeaviateStoreを作成
      return new WeaviateStore(embeddings, {
        client,
        indexName: className,
        textKey: textKey,
        metadataKeys: ["source", "startLine", "endLine", "documentType"],
      });
    }
    // Pineconeはディレクトリからのロードをサポートしていないため、別の方法が必要
    case "pinecone":
      throw new Error("Loading from directory is not supported for Pinecone");
    case "milvus":
      throw new Error("Loading from directory is not supported for Milvus");
    default:
      throw new Error(`Unsupported vector store type: ${type}`);
  }
}
