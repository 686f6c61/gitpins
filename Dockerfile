FROM node:22-alpine AS build
WORKDIR /app
COPY . .
ARG DATABASE_URL
ENV DATABASE_URL=${DATABASE_URL}
RUN npm ci
RUN npx prisma generate
RUN npm run build

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
