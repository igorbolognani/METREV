FROM node:24-alpine

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN corepack enable

WORKDIR /workspace

COPY . .

RUN pnpm install --no-frozen-lockfile
RUN pnpm --filter @metrev/research-worker build

CMD ["pnpm", "--filter", "@metrev/research-worker", "start"]
