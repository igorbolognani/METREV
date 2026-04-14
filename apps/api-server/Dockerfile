FROM node:24-alpine

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN corepack enable

WORKDIR /workspace

COPY . .

RUN pnpm install --no-frozen-lockfile

EXPOSE 4000

CMD ["sh", "-c", "pnpm run db:migrate:deploy && pnpm run db:seed && pnpm --filter @metrev/api-server start"]
