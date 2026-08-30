FROM ubuntu:22.04

# Custom arguments for versioning and app naming
ARG DOCKERFILE_VERSION=0.1.1
ARG APP_NAME=bstools-alias


# 0: Install dependencies and set up environment
# Avoid interactive prompts during apt installs
ENV DEBIAN_FRONTEND=noninteractive

# Install curl and nano for debugging (and basics nvm/node builds may need)
RUN apt-get update && \
    apt-get upgrade -y && \
    apt-get install -y --no-install-recommends curl ca-certificates nano && \
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

# Add oauth-client-node package from atproto ecosystem
# there is a known issue with core-js builds in pnpm, so we approve builds if the add fails
RUN pnpm add @atproto/oauth-client-node || pnpm approve-builds core-js

COPY resources/ .

CMD ["pnpm", "dev"]