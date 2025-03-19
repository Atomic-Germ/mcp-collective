#!/usr/bin/env node

// このスクリプトは、RAGサービスを直接呼び出して検索を実行するためのものです。
// Ollamaの埋め込みモデルを使用した検索が正しく機能するかどうかを確認します。

// 環境変数の設定
process.env.KNOWLEDGE_BASE_PATH = process.env.KNOWLEDGE_BASE_PATH || './docs';
process.env.VECTOR_STORE_TYPE = process.env.VECTOR_STORE_TYPE || 'hnswlib';
process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

// コンソール出力をstderrにリダイレクト
console.log = console.error;
console.warn = console.error;

// ビルド済みのRAGサービスを使用
const { RagService } = require('../dist/services/rag-service.js');

async function testSearch() {
  console.log('RAGサービスを使用した検索テストを実行します...');
  
  // RAGサービスを初期化
  const ragService = new RagService({
    knowledgeBasePath: process.env.KNOWLEDGE_BASE_PATH,
    vectorStoreType: process.env.VECTOR_STORE_TYPE,
    similarityThreshold: 0.3, // 類似度の閾値を下げる
    embeddingType: "ollama",
    embeddingConfig: { ollamaModel: "llama3" }
  });
  
  // ベクトルストアをロード
  const loaded = await ragService.loadExistingVectorStore();
  if (!loaded) {
    console.error('ベクトルストアが見つかりません。先に create-vector-store を実行してください。');
    return;
  }
  
  // 検索クエリを実行
  const query = "集約の設計には自己防衛義務が重要";
  console.log(`検索クエリ: "${query}"`);
  
  const results = await ragService.search({ query, limit: 5 });
  
  // 結果を表示
  console.log(`${results.length}件の結果が見つかりました：`);
  results.forEach((result, i) => {
    console.log(`\n--- 結果 ${i+1} (スコア: ${result.score.toFixed(4)}) ---`);
    console.log(`ソース: ${result.source}`);
    console.log(`内容: ${result.content.substring(0, 200)}...`);
  });
}

testSearch().catch(console.error);
