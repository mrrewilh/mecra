FROM node:22-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY server ./server

ENV PORT=8787
ENV CACHE_DIR=/cache
EXPOSE 8787
VOLUME ["/cache"]

CMD ["node", "server/index.js"]
