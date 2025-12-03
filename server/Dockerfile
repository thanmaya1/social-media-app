FROM node:18-alpine

WORKDIR /app

# Prevent Git hooks (husky) from running during image build
ENV HUSKY=0

# Copy package manifests and install dependencies. Use lockfile when present.
COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then \
			npm ci --no-audit --no-fund; \
		else \
			npm install --no-audit --no-fund; \
		fi

# Install nodemon globally for dev hot-reload availability inside the image
RUN npm install -g nodemon || true

# Copy source
COPY . .

# Create uploads folder
RUN mkdir -p /app/uploads

# Remove devDependencies to keep image lean
RUN npm prune --production || true

EXPOSE 5000

CMD ["node", "server.js"]
