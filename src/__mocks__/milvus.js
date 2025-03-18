const Milvus = {
  fromDocuments: () => Promise.resolve({
    similaritySearchWithScore: () => Promise.resolve([]),
  }),
};

module.exports = { Milvus };
