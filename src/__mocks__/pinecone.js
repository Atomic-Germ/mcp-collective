const PineconeStore = {
  fromDocuments: () => Promise.resolve({
    similaritySearchWithScore: () => Promise.resolve([]),
  }),
};

module.exports = { PineconeStore };
