FROM node:20-alpine AS builder

# Instalar pacotes de compatibilidade do OpenSSL para Prisma Engine no Alpine Linux
RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

# Copiar arquivos do monorepo
COPY package*.json ./
COPY packages/core/package*.json ./packages/core/
COPY packages/database/package*.json ./packages/database/
COPY packages/realtime/package*.json ./packages/realtime/
COPY apps/gestao/package*.json ./apps/gestao/

# Instalar dependências
RUN npm install

# Copiar código fonte
COPY packages/core ./packages/core
COPY packages/database ./packages/database
COPY packages/realtime ./packages/realtime
COPY apps/gestao ./apps/gestao

# Gerar Prisma Client
RUN npx prisma generate --schema=packages/database/prisma/schema.prisma

# Compilar pacotes e app
RUN npm run build --workspace=@cardap/core
RUN npm run build --workspace=@cardap/database
RUN npm run build --workspace=@cardap/realtime
RUN npm run build --workspace=@cardap/gestao

EXPOSE 3000

ENV PORT=3000
ENV HOST=0.0.0.0

CMD ["node", "apps/gestao/build"]
