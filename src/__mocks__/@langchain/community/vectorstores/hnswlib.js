const { Document } = require('@langchain/core/documents');

class HNSWLib {
  constructor() {
    this.documents = [];
    this.vectors = [];
  }

  static async fromDocuments(documents, embeddings, options = {}) {
    const instance = new HNSWLib();
    instance.documents = documents;
    // 簡易的なベクトル表現（実際のベクトルではなく、ドキュメントのインデックスを使用）
    instance.vectors = documents.map((_, i) => i);
    return instance;
  }

  static async fromTexts(texts, metadatas, embeddings, options = {}) {
    const documents = texts.map((text, i) => 
      new Document({
        pageContent: text,
        metadata: metadatas[i] || {},
      })
    );
    return HNSWLib.fromDocuments(documents, embeddings, options);
  }

  async save(directory) {
    // ディレクトリへの保存をシミュレート
    if (global.setVectorStoreExists) {
      global.setVectorStoreExists();
    }
    return true;
  }

  async load(directory) {
    // ディレクトリからのロードをシミュレート
    return this;
  }
  
  // 静的なloadメソッドを追加
  static async load(directory, embeddings) {
    // ディレクトリからのロードをシミュレート
    const instance = new HNSWLib();
    instance.documents = [
      new Document({
        pageContent: 'Loaded document 1',
        metadata: { source: 'test1.md' }
      }),
      new Document({
        pageContent: 'Loaded document 2',
        metadata: { source: 'test2.md' }
      })
    ];
    instance.vectors = instance.documents.map((_, i) => i);
    return instance;
  }

  async similaritySearchWithScore(query, k = 4) {
    // 簡易的な類似度検索の実装
    // 実際のベクトル計算は行わず、保存されたドキュメントから上位k件を返す
    
    // テスト用のドキュメントを作成
    const docs = [
      new Document({
        pageContent: '# テストドキュメント1\n\nこれはテスト用のマークダウンファイルです。\n\n## セクション1\n\nこのセクションには、テスト用のコンテンツが含まれています。\nRAGシステムのテストに使用されます。\n\n## セクション2\n\nこのセクションには、検索用のキーワードが含まれています。\n例えば、「ベクトルストア」や「埋め込み」などのキーワードです。',
        metadata: { source: 'test-knowledge-base/test1.md' }
      }),
      new Document({
        pageContent: '# テストドキュメント2\n\nこれは2つ目のテスト用マークダウンファイルです。\n\n## 検索テスト\n\nこのファイルは、検索機能のテストに使用されます。\n特定のキーワードを含むドキュメントを検索できるかどうかをテストします。\n\n## キーワード\n\n以下のキーワードを含みます：\n- LangChain\n- OpenAI\n- ベクトル検索\n- 類似度スコア\n- チャンク分割',
        metadata: { source: 'test-knowledge-base/test2.md' }
      })
    ];
    
    return docs.slice(0, k).map((doc, i) => [doc, 0.9 - (i * 0.1)]);
  }
}

module.exports = { HNSWLib };
