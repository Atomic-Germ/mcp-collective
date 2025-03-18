const { TextLoader } = require('langchain/document_loaders/fs/text');
const { Document } = require('@langchain/core/documents');

class DirectoryLoader {
  constructor(directoryPath, loaders) {
    this.directoryPath = directoryPath;
    this.loaders = loaders;
  }

  async load() {
    // テスト用のモックドキュメントを返す
    return [
      new Document({
        pageContent: '# テストドキュメント1\n\nこれはテスト用のマークダウンファイルです。\n\n## セクション1\n\nこのセクションには、テスト用のコンテンツが含まれています。\nRAGシステムのテストに使用されます。\n\n## セクション2\n\nこのセクションには、検索用のキーワードが含まれています。\n例えば、「ベクトルストア」や「埋め込み」などのキーワードです。',
        metadata: {
          source: 'test-knowledge-base/test1.md',
        },
      }),
      new Document({
        pageContent: '# テストドキュメント2\n\nこれは2つ目のテスト用マークダウンファイルです。\n\n## 検索テスト\n\nこのファイルは、検索機能のテストに使用されます。\n特定のキーワードを含むドキュメントを検索できるかどうかをテストします。\n\n## キーワード\n\n以下のキーワードを含みます：\n- LangChain\n- OpenAI\n- ベクトル検索\n- 類似度スコア\n- チャンク分割',
        metadata: {
          source: 'test-knowledge-base/test2.md',
        },
      }),
    ];
  }
}

module.exports = { DirectoryLoader };
