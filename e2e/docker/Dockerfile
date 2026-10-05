FROM node:22-slim
# Real dsh host + pnpm (dsh plugin add forwards to pnpm); curl for probes.
RUN npm install -g pnpm@12 @deepseek-ai/dsh@0.2.0-rc.2 \
    && apt-get update && apt-get install -y --no-install-recommends curl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
ENV DSH_HOME=/e2e/home
WORKDIR /e2e
