FROM node:18-alpine AS build
WORKDIR /app

# Prevent Git hooks (husky) from running during image build
ENV HUSKY=0

# Copy package manifests and install. Use lockfile when present, otherwise fallback to install.
COPY package.json package-lock.json* ./

# If a prebuilt `dist` folder exists in the build context (we'll create it locally to avoid
# in-container npm SSL/registry issues), skip install + build and copy `dist` directly.
# Otherwise, install deps and run the build inside the image as a fallback.
COPY . .
RUN if [ -d ./dist ]; then \
			echo "Using prebuilt dist/ - skipping npm install and build"; \
		else \
			if [ -f package-lock.json ]; then \
				npm ci --no-audit --no-fund; \
			else \
				npm install --no-audit --no-fund; \
			fi && npm run build; \
		fi

FROM nginx:stable-alpine AS production
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
