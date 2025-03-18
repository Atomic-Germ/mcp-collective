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
    // OpenAIEmbeddingsのモック
    '@langchain/openai': '<rootDir>/src/__mocks__/@langchain/openai.js',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
      },
    ],
  },
  // 結合テストとユニットテストを分けて実行するための設定
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '!**/__tests__/integration/**/*.test.ts',
  ],
};
