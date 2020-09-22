# docker build -t geoos/portal:latest -t geoos/portal:0.17 .
# docker push geoos/portal:latest

FROM node:14-alpine
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install --production

COPY . .
CMD ["node", "index"]