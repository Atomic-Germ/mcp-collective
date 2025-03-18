// node:fsのモック
const fs = {
  existsSync: (path) => {
    // テスト用のパスが存在するかどうかをシミュレート
    if (path.includes('test-knowledge-base')) {
      return true;
    }
    if (path.includes('.vector-store')) {
      // 最初は存在しないが、初期化後は存在する
      return global.__VECTOR_STORE_EXISTS__ || false;
    }
    return false;
  },
  
  rmSync: (path, options) => {
    // ファイル削除をシミュレート
    if (path.includes('.vector-store')) {
      global.__VECTOR_STORE_EXISTS__ = false;
    }
    return true;
  },
  
  // その他必要なメソッド
};

module.exports = fs;
