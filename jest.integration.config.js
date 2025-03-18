module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    // Milvusのモック
    '@langchain/community/vectorstores/milvus': '<rootDir>/src/__mocks__/milvus.js',
    // Pineconeのモック
    '@langchain/community/vectorstores/pinecone': '<rootDir>/src/__mocks__/pinecone.js',
    // HNSWLibのモック
    '@langchain/community/vectorstores/hnswlib': '<rootDir>/src/__mocks__/@langchain/community/vectorstores/hnswlib.js',
    // OpenAIEmbeddingsのモック
    '@langchain/openai': '<rootDir>/src/__mocks__/@langchain/openai.js',
    // DirectoryLoaderのモック
    'langchain/document_loaders/fs/directory': '<rootDir>/src/__mocks__/langchain/document_loaders/fs/directory.js',
    // TextLoaderのモック
    'langchain/document_loaders/fs/text': '<rootDir>/src/__mocks__/langchain/document_loaders/fs/text.js',
    // RecursiveCharacterTextSplitterのモック
    'langchain/text_splitter': '<rootDir>/src/__mocks__/langchain/text_splitter.js',
    // node:fsのモック
    'node:fs': '<rootDir>/src/__mocks__/node_fs.js',
    // node:pathのモック
    'node:path': '<rootDir>/src/__mocks__/node_path.js',
    // vector-store-factoryのモック
    '../../services/vector-store-factory.js': '<rootDir>/src/__mocks__/vector-store-factory.js',
    '../vector-store-factory.js': '<rootDir>/src/__mocks__/vector-store-factory.js',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
      },
    ],
  },
  // 結合テストのみを実行するための設定
  testMatch: [
    '**/__tests__/integration/**/*.test.ts',
  ],
  // テスト環境のセットアップ
  setupFiles: ['<rootDir>/src/__tests__/integration/setup.js'],
};
