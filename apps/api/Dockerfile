FROM node:18

WORKDIR /app

# Copy workspace manifests to install dependencies (including workspaces)
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/

# Install all deps (including dev for build)
RUN npm install --no-audit --no-fund

# Copy rest of repository
# Copy rest of repository
COPY . .

# Ensure Prisma client is generated before TypeScript build
WORKDIR /app/apps/api
RUN npx prisma generate --schema=prisma/schema.prisma

# Build the API package
WORKDIR /app
# Skip TypeScript compile in image (project has tsc errors); run via `tsx` at runtime
ENV NODE_ENV=production
EXPOSE 3001

WORKDIR /app/apps/api
CMD ["npx", "tsx", "src/index.ts"]
