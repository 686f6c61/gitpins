FROM node:22-alpine AS build

WORKDIR /app

ENV PNPM_HOME="/pnpm"
ENV PATH="${PNPM_HOME}:${PATH}"

RUN corepack enable

COPY package.json pnpm-lock.yaml ./
COPY prisma.config.ts ./
COPY prisma ./prisma

RUN pnpm install --frozen-lockfile

COPY . .

ARG DATABASE_URL=postgresql://gitpins:gitpins@localhost:5432/gitpins
ENV DATABASE_URL=${DATABASE_URL}

RUN pnpm exec prisma generate
RUN pnpm run build

FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=build /app/public ./public
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/src/generated ./src/generated

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
