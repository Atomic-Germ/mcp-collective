const { Document } = require('@langchain/core/documents');

class TextLoader {
  constructor(filePath) {
    this.filePath = filePath;
  }

  async load() {
    // ファイルパスに基づいてモックコンテンツを返す
    let content = '';
    
    if (this.filePath.includes('test1.md')) {
      content = '# テストドキュメント1\n\nこれはテスト用のマークダウンファイルです。\n\n## セクション1\n\nこのセクションには、テスト用のコンテンツが含まれています。\nRAGシステムのテストに使用されます。\n\n## セクション2\n\nこのセクションには、検索用のキーワードが含まれています。\n例えば、「ベクトルストア」や「埋め込み」などのキーワードです。';
    } else if (this.filePath.includes('test2.md')) {
      content = '# テストドキュメント2\n\nこれは2つ目のテスト用マークダウンファイルです。\n\n## 検索テスト\n\nこのファイルは、検索機能のテストに使用されます。\n特定のキーワードを含むドキュメントを検索できるかどうかをテストします。\n\n## キーワード\n\n以下のキーワードを含みます：\n- LangChain\n- OpenAI\n- ベクトル検索\n- 類似度スコア\n- チャンク分割';
    }
    
    return [
      new Document({
        pageContent: content,
        metadata: {
          source: this.filePath,
        },
      }),
    ];
  }
}

module.exports = { TextLoader };
