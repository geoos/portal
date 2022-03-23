# // Multiplataforma
# docker buildx build --push --platform linux/amd64,linux/arm64 -t docker.homejota.net/geoos/portal:latest -t docker.homejota.net/geoos/portal:0.92 .
#

FROM node:14-alpine
EXPOSE 8090
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install --production

COPY . .
CMD ["node", "index"]