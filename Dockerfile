# Base image
FROM node:22-alpine3.19

# Set a default port
ARG PORT=3000
ENV PORT=${PORT}

# Set working directory to the root of the project
WORKDIR /app

# Copy root-level package.json and yarn.lock for dependency resolution
COPY package.json yarn.lock tsconfig.json ./

# Copy the packages folder (containing all 6 packages)
COPY packages ./packages

# Install dependencies for the entire monorepo
RUN yarn install

# Build all packages (assumes the root-level build script handles this)
RUN yarn build

# Set the working directory to the server package
WORKDIR /app/packages/server

# Expose the application port
EXPOSE ${PORT}

# Start the server
RUN yarn start
