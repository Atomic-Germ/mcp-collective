const { HNSWLib } = require('@langchain/community/vectorstores/hnswlib');

// createVectorStoreのモック実装
async function createVectorStore(type, documents, embeddings, config = {}) {
  if (type === 'hnswlib') {
    return HNSWLib.fromDocuments(documents, embeddings, config);
  }
  
  if (type === 'chroma') {
    // Chromaのモック
    const mockChroma = {
      similaritySearchWithScore: async (query, k = 4) => {
        return documents.slice(0, k).map((doc, i) => [doc, 0.9 - (i * 0.1)]);
      }
    };
    return mockChroma;
  }
  
  // その他のベクトルストアタイプの場合
  return {
    similaritySearchWithScore: async (query, k = 4) => {
      return documents.slice(0, k).map((doc, i) => [doc, 0.9 - (i * 0.1)]);
    }
  };
}

// loadVectorStoreのモック実装
async function loadVectorStore(type, directory, embeddings) {
  if (type === 'hnswlib') {
    // HNSWLibのインスタンスを作成して返す
    const instance = new HNSWLib();
    
    // テスト用のドキュメントを設定
    instance.documents = [
      {
        pageContent: '# テストドキュメント1\n\nこれはテスト用のマークダウンファイルです。',
        metadata: { source: 'test-knowledge-base/test1.md' }
      },
      {
        pageContent: '# テストドキュメント2\n\nこれは2つ目のテスト用マークダウンファイルです。',
        metadata: { source: 'test-knowledge-base/test2.md' }
      }
    ];
    
    return instance;
  }
  
  // その他のベクトルストアタイプの場合
  return null;
}

module.exports = {
  createVectorStore,
  loadVectorStore
};
