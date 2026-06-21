FROM node:22-alpine

WORKDIR /app

# Install build dependencies if needed, then package files
COPY package*.json ./
RUN npm ci

COPY . .

RUN npm run build

EXPOSE 3001

CMD ["node", "dist/index.js"]
