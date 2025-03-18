// テスト環境のセットアップ

// グローバル変数の初期化
global.__VECTOR_STORE_EXISTS__ = false;

// HNSWLibのsaveメソッドが呼ばれたときにフラグを設定するためのモック関数
global.setVectorStoreExists = () => {
  global.__VECTOR_STORE_EXISTS__ = true;
};
