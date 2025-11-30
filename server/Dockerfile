FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci --production

# Copy source
COPY . .

# Create uploads folder
RUN mkdir -p /app/uploads

EXPOSE 5000

CMD ["node", "server.js"]
