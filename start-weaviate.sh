#!/bin/bash

docker-compose up -d

echo "Waiting for Weaviate to start..."
sleep 5
curl -s http://localhost:8080/v1/.well-known/ready || echo "Weaviate is not ready yet. Please wait a few more seconds."
echo "Weaviate is running at http://localhost:8080"
