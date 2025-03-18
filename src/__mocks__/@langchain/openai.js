class OpenAIEmbeddings {

  async embedDocuments(texts) {
    // 簡易的なモック実装：各テキストに対して固定長のランダムな埋め込みベクトルを返す
    return texts.map(() => {
      // 1536次元のベクトル（OpenAIの埋め込みと同じ次元数）
      return Array.from({ length: 1536 }, () => Math.random() - 0.5);
    });
  }

  async embedQuery(text) {
    // 簡易的なモック実装：クエリに対して固定長のランダムな埋め込みベクトルを返す
    return Array.from({ length: 1536 }, () => Math.random() - 0.5);
  }
}

module.exports = { OpenAIEmbeddings };
