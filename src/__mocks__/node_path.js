// node:pathのモック
const path = {
  join: (...paths) => {
    // パスの結合をシミュレート
    return paths.join('/');
  },
  
  resolve: (...paths) => {
    // パスの解決をシミュレート
    return paths.join('/');
  },
  
  // その他必要なメソッド
};

module.exports = path;
