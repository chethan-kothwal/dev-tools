#!/bin/bash
set -e

# Configuration
IMAGE_NAME="ghcr.io/username/tools-website"

# Get version from git tag or use 'latest'
if git describe --tags --exact-match 2>/dev/null; then
    VERSION=$(git describe --tags --exact-match)
else
    VERSION="latest"
fi

echo "Building Docker image: ${IMAGE_NAME}:${VERSION}"

# Build the Docker image
docker build -t "${IMAGE_NAME}:${VERSION}" .

# Also tag as latest if it's a versioned tag
if [ "$VERSION" != "latest" ]; then
    docker tag "${IMAGE_NAME}:${VERSION}" "${IMAGE_NAME}:latest"
    echo "Tagged as latest"
fi

echo ""
echo "Build complete. To push to registry, run:"
echo "  docker push ${IMAGE_NAME}:${VERSION}"
if [ "$VERSION" != "latest" ]; then
    echo "  docker push ${IMAGE_NAME}:latest"
fi
echo ""
echo "Or run: ./docker-push.sh ${VERSION}"
