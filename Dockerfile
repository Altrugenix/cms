FROM node:22-alpine AS base
RUN corepack enable && corepack prepare yarn@4.17.0 --activate
WORKDIR /app

COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn/ .yarn/
COPY turbo.json ./

COPY packages/ packages/
COPY apps/api/ apps/api/

RUN yarn install --immutable
RUN yarn build

FROM node:22-alpine AS runner
RUN corepack enable && corepack prepare yarn@4.17.0 --activate
WORKDIR /app

COPY --from=base /app/package.json ./
COPY --from=base /app/yarn.lock ./
COPY --from=base /app/.yarnrc.yml ./
COPY --from=base /app/.yarn/ .yarn/
COPY --from=base /app/packages/ packages/
COPY --from=base /app/apps/api/dist/ apps/api/dist/
COPY --from=base /app/apps/api/package.json apps/api/
COPY --from=base /app/turbo.json ./

RUN yarn workspaces focus --production

EXPOSE 3000
ENV NODE_ENV=production
CMD ["node", "apps/api/dist/index.js"]
