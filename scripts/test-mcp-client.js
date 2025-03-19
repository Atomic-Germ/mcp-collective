#!/usr/bin/env node

// このスクリプトは、MCPサーバーにリクエストを送信するためのものです。
// MCPサーバーが正しく動作しているかどうかを確認します。

const fs = require('node:fs');
const { spawn } = require('node:child_process');

// MCPサーバーを起動する関数
function startMcpServer() {
  console.log('MCPサーバーを起動しています...');
  
  // 環境変数を設定
  const env = {
    ...process.env,
    KNOWLEDGE_BASE_PATH: './test-knowledge-base',
    VECTOR_STORE_TYPE: 'weaviate',
    VECTOR_STORE_CONFIG: JSON.stringify({
      url: 'http://localhost:8080',
      className: 'Document',
      textKey: 'content'
    })
  };
  
  // MCPサーバーを起動
  const server = spawn('node', ['../dist/index.js'], {
    env,
    stdio: ['pipe', 'pipe', process.stderr],
  });
  
  // 標準出力を処理
  server.stdout.on('data', (data) => {
    console.log(`サーバー出力: ${data}`);
  });
  
  // エラーハンドリング
  server.on('error', (error) => {
    console.error(`サーバーエラー: ${error.message}`);
    process.exit(1);
  });
  
  // サーバーが終了したときの処理
  server.on('close', (code) => {
    console.log(`サーバーが終了しました（コード: ${code}）`);
    process.exit(code);
  });
  
  return server;
}

// リクエストを送信する関数
function sendRequest(server) {
  console.log('リクエストを送信しています...');
  
  // JSONメッセージをファイルから読み込み、コンパクトな形式に変換
  const jsonObj = JSON.parse(fs.readFileSync('../test-mcp-request.json', 'utf8'));
  const messageStr = JSON.stringify(jsonObj);
  
  // 送信前にJSONの形式を確認
  try {
    JSON.parse(messageStr);
    console.log('JSONの形式は正しいです');
  } catch (error) {
    console.error('JSONの形式に問題があります:', error);
    process.exit(1);
  }
  const messageLength = Buffer.byteLength(messageStr, 'utf8');
  
  // ヘッダーを作成（重要: \r\n\r\nで終わる必要がある）
  const header = `Content-Length: ${messageLength}\r\n\r\n`;
  
  // リクエストを送信（ヘッダー + メッセージ）
  server.stdin.write(header + messageStr);
  
  console.log('送信したメッセージ:');
  console.log(`ヘッダー: ${header.replace(/\r\n/g, '\\r\\n')}`);
  console.log(`本体: ${messageStr}`);
  
  // レスポンスを処理
  let buffer = '';
  let contentLength = -1;
  let headerReceived = false;
  
  server.stdout.on('data', (data) => {
    const chunk = data.toString();
    console.log(`受信データ: ${chunk.substring(0, 100)}${chunk.length > 100 ? '...' : ''}`);
    buffer += chunk;
    
    // ヘッダーとメッセージ本体を分離
    if (!headerReceived) {
      const headerEnd = buffer.indexOf('\r\n\r\n');
      if (headerEnd !== -1) {
        const header = buffer.substring(0, headerEnd);
        const lengthMatch = header.match(/Content-Length: (\d+)/i);
        if (lengthMatch) {
          contentLength = Number.parseInt(lengthMatch[1], 10);
          buffer = buffer.substring(headerEnd + 4); // 4 = \r\n\r\n の長さ
          headerReceived = true;
          console.log(`ヘッダー受信: Content-Length = ${contentLength}`);
        }
      }
    }
    
    // メッセージ本体が完全に受信されたかチェック
    if (headerReceived && buffer.length >= contentLength) {
      const message = buffer.substring(0, contentLength);
      buffer = buffer.substring(contentLength);
      headerReceived = false;
      
      try {
        // JSONレスポンスをパース
        const response = JSON.parse(message);
        
        // レスポンスを表示
        console.log('\n--- MCPサーバーからのレスポンス ---');
        console.log(JSON.stringify(response, null, 2));
        
        // サーバーを終了
        console.log('\nテスト完了。Ctrl+Cで終了してください。');
      } catch (error) {
        console.error('JSONパースエラー:', error);
        console.error('受信したメッセージ:', message);
      }
    }
  });
}

// メイン処理
function main() {
  console.log('MCPサーバーのテストを開始します...');
  
  // MCPサーバーを起動
  const server = startMcpServer();
  
  // サーバーの起動を待ってからリクエストを送信
  setTimeout(() => {
    sendRequest(server);
  }, 3000);
}

// スクリプトを実行
main();
