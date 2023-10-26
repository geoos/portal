VERSION=1.25
docker buildx build --push --platform linux/amd64,linux/arm64 -t docker.homejota.net/geoos/portal:latest -t docker.homejota.net/geoos/portal:$VERSION .
