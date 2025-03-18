const { Document } = require('@langchain/core/documents');

class RecursiveCharacterTextSplitter {
  constructor(options) {
    this.chunkSize = options.chunkSize || 1000;
    this.chunkOverlap = options.chunkOverlap || 200;
  }

  async splitDocuments(documents) {
    // 簡易的なモック実装：各ドキュメントを3つのチャンクに分割
    const result = [];
    
    for (const doc of documents) {
      const content = doc.pageContent;
      const metadata = doc.metadata;
      
      // コンテンツの長さに基づいて分割
      const length = content.length;
      const chunkSize = Math.floor(length / 3);
      
      // 3つのチャンクを作成
      for (let i = 0; i < 3; i++) {
        const start = i * chunkSize;
        const end = i === 2 ? length : (i + 1) * chunkSize;
        
        result.push(
          new Document({
            pageContent: content.substring(start, end),
            metadata: { ...metadata, chunk: i + 1 },
          })
        );
      }
    }
    
    return result;
  }
}

module.exports = { RecursiveCharacterTextSplitter };
