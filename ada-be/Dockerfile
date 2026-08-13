FROM node:24-alpine AS dependencies
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM dependencies AS build
COPY prisma ./prisma
COPY prisma.config.ts ./
COPY nest-cli.json tsconfig*.json ./
COPY src ./src
RUN npm run prisma:generate && npm run build

FROM node:24-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache dumb-init
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
COPY --from=build /app/src/generated ./src/generated
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma.config.ts ./
USER node
EXPOSE 3000
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]
