#!/bin/bash

echo "Rebuilding vector store with Weaviate..."

KNOWLEDGE_BASE_PATH=../docs \
VECTOR_STORE_TYPE=weaviate \
VECTOR_STORE_CONFIG='{"url":"http://localhost:8080","className":"Document","textKey":"content"}' \
node ./create-vector-store.js

echo "Vector store rebuilt successfully."
