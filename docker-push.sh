#!/bin/bash
set -e

# Configuration
IMAGE_NAME="ghcr.io/username/tools-website"

# Use provided version or default to 'latest'
VERSION=${1:-latest}

echo "Pushing Docker image: ${IMAGE_NAME}:${VERSION}"

# Push the specified version
docker push "${IMAGE_NAME}:${VERSION}"

# If pushing a versioned tag, also push latest
if [ "$VERSION" != "latest" ]; then
    echo "Also pushing: ${IMAGE_NAME}:latest"
    docker push "${IMAGE_NAME}:latest"
fi

echo ""
echo "Push complete!"
