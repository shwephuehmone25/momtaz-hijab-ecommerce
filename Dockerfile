FROM node:24-bookworm-slim AS dependencies

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

FROM dependencies AS build

COPY nest-cli.json tsconfig.json tsconfig.build.json ./
COPY prisma.config.ts env.validation.ts ./
COPY prisma ./prisma
COPY src ./src

RUN npm run build

FROM node:24-bookworm-slim AS production-dependencies

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

FROM node:24-bookworm-slim AS runtime

ENV NODE_ENV=production
ENV PORT=10000

WORKDIR /app

COPY --from=production-dependencies /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./

USER node

EXPOSE 10000

CMD ["node", "dist/src/main.js"]
