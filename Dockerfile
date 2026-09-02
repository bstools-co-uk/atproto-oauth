FROM ubuntu:22.04

# Custom arguments for versioning and app naming
ARG DOCKERFILE_VERSION=0.2.0
ARG APP_NAME=bstools-alias


# 0: Install dependencies and set up environment
# Avoid interactive prompts during apt installs
ENV DEBIAN_FRONTEND=noninteractive

# Install curl and nano for debugging (and basics nvm/node builds may need)
# git may be needed, according to error logs; experimentation needed
# jq is needed for JSON manipulation in scripts
RUN apt-get update && \
    apt-get upgrade -y && \
    apt-get install -y --no-install-recommends curl ca-certificates nano git jq&& \
    rm -rf /var/lib/apt/lists/*

# Set up NVM environment variables
ENV NVM_DIR=/root/.nvm
ENV NODE_VERSION=lts
ENV PNPM_HOME=/root/.local/share/pnpm
ENV PATH=$PNPM_HOME:$PATH

# Install nvm, then node (LTS) and pnpm, all in one shell so env vars persist
# Using bash explicitly since nvm's install script and `source` require it
SHELL ["/bin/bash", "-c"]

RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.6/install.sh | bash \
    && source "$NVM_DIR/nvm.sh" \
    && nvm install --lts \
    && nvm use --lts \
    && nvm alias default lts/* \
    && npm install -g pnpm

# Make node/npm/pnpm available in every subsequent RUN/CMD without sourcing manually
ENV NODE_PATH=$NVM_DIR/versions/node
RUN echo 'export NVM_DIR="/root/.nvm"' >> /root/.bashrc && \
    echo '[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"' >> /root/.bashrc

# Symlink the installed node/npm/pnpm into a stable PATH location
RUN NODE_BIN_DIR=$(dirname $(source "$NVM_DIR/nvm.sh" && nvm which default)) && \
    ln -s "$NODE_BIN_DIR/node" /usr/local/bin/node && \
    ln -s "$NODE_BIN_DIR/npm" /usr/local/bin/npm && \
    ln -s "$NODE_BIN_DIR/npx" /usr/local/bin/npx && \
    ln -s "$NODE_BIN_DIR/pnpm" /usr/local/bin/pnpm

WORKDIR /app


# The following sections are based on: https://atproto.com/guides/oauth-tutorial, as read at 30/08/2026.
#1. Create projecct

# Create project
RUN pnpm create next-app@latest ${APP_NAME} --yes
WORKDIR /app/${APP_NAME}

# Modify next.config.ts to include allowedDevOrigins
RUN echo "import type { NextConfig } from \"next\";\
\
const nextConfig: NextConfig = {\
  allowedDevOrigins: [\"127.0.0.1\"],\
};\
\
export default nextConfig;" > next.config.ts

# In the following sections, certain packages have been identified as requiring approval for builds due to their native dependencies.
# The `pnpm approve-builds` command is used to handle these cases.
# core-js; better-sqlite3; esbuild

# Add oauth-client-node package from atproto ecosystem
RUN pnpm add @atproto/oauth-client-node || pnpm approve-builds core-js

# 2. Add database capability to the project (necessary for DPoP etc.)
RUN pnpm add better-sqlite3 || pnpm approve-builds better-sqlite3
RUN pnpm add kysely
RUN pnpm add -D @types/better-sqlite3
RUN pnpm add -D tsx || pnpm approve-builds esbuild && pnpm add -D tsx

# Update next.config.ts to include experimental features for the database
RUN echo "import type { NextConfig } from \"next\";\
\
const nextConfig: NextConfig = {\
  allowedDevOrigins: [\"127.0.0.1\"],\
  serverExternalPackages: [\"better-sqlite3\"],\
};\
\
export default nextConfig;" > next.config.ts
#RUN pnpm add -D tsx

# Update package.json scripts to include migration and development commands
RUN jq '\
  .scripts.migrate = "tsx scripts/migrate.ts"\
  | .scripts.dev = "pnpm migrate && next dev"\
  | .scripts.start = "pnpm migrate && next start"\
  ' package.json > package.tmp.json && mv package.tmp.json package.json


COPY resources/ .

CMD ["pnpm", "dev"]