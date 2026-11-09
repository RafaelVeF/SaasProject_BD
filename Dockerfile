FROM node:20-alpine
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install --omit=dev
COPY config.env ./
COPY server.js ./
COPY src ./src
COPY public ./public
EXPOSE 3000
CMD ["node", "server.js"]
