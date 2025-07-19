# Stage 1: Build the React application
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Setup production server
FROM node:22-alpine
WORKDIR /app

# Copy built assets, server code, and dependencies
COPY --from=build /app/dist /app/dist
COPY --from=build /app/dist-server /app/dist-server
# Copy installed dependencies from the build stage
COPY --from=build /app/node_modules /app/dist-server/node_modules
COPY package*.json ./



EXPOSE 3000
WORKDIR /app/dist-server
CMD [ "node", "server.js" ]
