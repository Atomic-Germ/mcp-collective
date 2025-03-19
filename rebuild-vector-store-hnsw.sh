#!/bin/bash

echo "Rebuilding vector store with HNSWLib..."

KNOWLEDGE_BASE_PATH=./docs \
VECTOR_STORE_TYPE=hnswlib \
VECTOR_STORE_CONFIG='{}' \
node create-vector-store.js

echo "Vector store rebuilt successfully."
