FROM node:22-slim AS build
WORKDIR /app
RUN corepack enable
COPY . .
RUN pnpm install --frozen-lockfile && pnpm --filter @stonks/client build
ARG GIT_SHA=""
RUN echo "$GIT_SHA" > .version

FROM node:22-slim
RUN apt-get update && apt-get install -y --no-install-recommends git ca-certificates && rm -rf /var/lib/apt/lists/*
RUN corepack enable
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
COPY --from=build /app /app
COPY scripts/start.sh /usr/local/bin/start.sh
WORKDIR /app
ENV NODE_ENV=production PORT=3000 DATA_DIR=/data
VOLUME /data
EXPOSE 3000
CMD ["/usr/local/bin/start.sh"]
