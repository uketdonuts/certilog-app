FROM node:18

WORKDIR /app

# Copy root and workspace manifests to install dependencies
COPY package.json package-lock.json ./
COPY apps/dashboard/package.json ./apps/dashboard/
COPY packages/shared/package.json ./packages/shared/

RUN npm install --no-audit --no-fund

# Copy repository
COPY . .

# Build dashboard
WORKDIR /app/apps/dashboard
RUN npm --workspace @certilog/dashboard run build

ENV NODE_ENV=production
EXPOSE 3000

CMD ["npm", "--workspace", "@certilog/dashboard", "start"]
