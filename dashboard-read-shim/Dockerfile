FROM node:22-alpine

WORKDIR /app

# Install deps first to leverage layer cache when only source changes.
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev || npm install --omit=dev

COPY server.js dispatcher.js ./

ENV NODE_ENV=production
EXPOSE 3030

# tini-less: node handles SIGTERM in <1s for this trivial server, and the
# alpine base ships dumb-init only on request. If we ever add long-lived
# work, swap to: ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "server.js"]
