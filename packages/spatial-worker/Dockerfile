FROM node:24-alpine

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN corepack enable

WORKDIR /workspace

COPY . .

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @metrev/spatial-worker build

CMD ["pnpm", "--filter", "@metrev/spatial-worker", "start"]
