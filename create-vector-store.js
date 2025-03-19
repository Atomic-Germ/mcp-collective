#!/usr/bin/env node

// このスクリプトは、ベクトルストアを事前に作成するためのものです。
// Claude Desktopとの連携前に実行することで、初期化時間を短縮できます。

// 環境変数の設定
process.env.KNOWLEDGE_BASE_PATH = process.env.KNOWLEDGE_BASE_PATH || './test-knowledge-base';
process.env.VECTOR_STORE_TYPE = process.env.VECTOR_STORE_TYPE || 'hnswlib';
process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

// コンソール出力をstderrにリダイレクト
console.log = console.error;
console.warn = console.error;

// ビルド済みのRAGサービスを使用
const { RagService } = require('./dist/services/rag-service.js');

async function main() {
  console.log('ベクトルストアを事前に作成します...');
  console.log(`ナレッジベースパス: ${process.env.KNOWLEDGE_BASE_PATH}`);
  console.log(`ベクトルストアタイプ: ${process.env.VECTOR_STORE_TYPE}`);
  
  // RAGサービスを初期化
  const ragService = new RagService({
    knowledgeBasePath: process.env.KNOWLEDGE_BASE_PATH,
    vectorStoreType: process.env.VECTOR_STORE_TYPE,
    embeddingType: process.env.OPENAI_API_KEY ? "openai" : "ollama",
    embeddingConfig: process.env.OPENAI_API_KEY 
      ? { openAIApiKey: process.env.OPENAI_API_KEY }
      : { ollamaModel: "llama3" }
  });
  
  // 強制的に新しいベクトルストアを作成
  console.log('ベクトルストアを新しく作成します...');
  await ragService.initialize();
  console.log('ベクトルストアの作成が完了しました。');
  
  console.log('完了しました。Claude Desktopと連携する準備ができました。');
}

main().catch(error => {
  console.error('エラーが発生しました:', error);
  process.exit(1);
});
