#!/usr/bin/env node

// このスクリプトは、ダミーの埋め込みを使用してベクトルストアを事前に作成するためのものです。
// Claude Desktopとの連携前に実行することで、初期化時間を短縮できます。

const fs = require('fs');
const path = require('path');
const { HNSWLib } = require('@langchain/community/vectorstores/hnswlib');
const { Document } = require('@langchain/core/documents');

// 環境変数の設定
const KNOWLEDGE_BASE_PATH = process.env.KNOWLEDGE_BASE_PATH || './test-knowledge-base';

// ダミーの埋め込みクラス
class DummyEmbeddings {
  constructor() {}
  
  async embedQuery() {
    return new Array(384).fill(0).map((_, i) => i / 384);
  }
  
  async embedDocuments(documents) {
    return documents.map(() => new Array(384).fill(0).map((_, i) => i / 384));
  }
}

async function main() {
  console.log('ダミーの埋め込みを使用してベクトルストアを事前に作成します...');
  console.log(`ナレッジベースパス: ${KNOWLEDGE_BASE_PATH}`);
  
  // ベクトルストアのパス
  const vectorStorePath = path.join(KNOWLEDGE_BASE_PATH, '.vector-store');
  
  // 既存のベクトルストアをチェック
  if (fs.existsSync(vectorStorePath)) {
    console.log('既存のベクトルストアが見つかりました。');
    console.log('ベクトルストアは既に作成されています。');
    return;
  }
  
  console.log('既存のベクトルストアが見つかりませんでした。新しく作成します...');
  
  // ナレッジベースのファイルを読み込む
  const files = fs.readdirSync(KNOWLEDGE_BASE_PATH)
    .filter(file => file.endsWith('.md') || file.endsWith('.txt'));
  
  console.log(`${files.length}個のファイルを読み込みました。`);
  
  // ドキュメントを作成
  const documents = [];
  for (const file of files) {
    const filePath = path.join(KNOWLEDGE_BASE_PATH, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // 簡易的なチャンク分割（各行を1つのチャンクとする）
    const lines = content.split('\n').filter(line => line.trim().length > 0);
    
    for (let i = 0; i < lines.length; i++) {
      documents.push(
        new Document({
          pageContent: lines[i],
          metadata: {
            source: file,
            startLine: i + 1,
            endLine: i + 1
          }
        })
      );
    }
  }
  
  console.log(`${documents.length}個のチャンクを作成しました。`);
  
  // ダミーの埋め込みを使用してベクトルストアを作成
  const embeddings = new DummyEmbeddings();
  const vectorStore = await HNSWLib.fromDocuments(documents, embeddings);
  
  // ベクトルストアを保存
  await vectorStore.save(vectorStorePath);
  
  console.log(`ベクトルストアを ${vectorStorePath} に保存しました。`);
  console.log('完了しました。Claude Desktopと連携する準備ができました。');
}

main().catch(error => {
  console.error('エラーが発生しました:', error);
  process.exit(1);
});
