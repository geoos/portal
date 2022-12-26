# // Multiplataforma (prod: 0.95)
# docker buildx build --push --platform linux/amd64 -t docker.homejota.net/geoos/portal:latest -t docker.homejota.net/geoos/portal:1.23 .
#

FROM node:14-alpine
EXPOSE 8090
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install --production

COPY . .
CMD ["node", "index"]