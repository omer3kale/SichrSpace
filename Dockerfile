FROM node:18
WORKDIR /app

# Copy root package.json and install dependencies
COPY package*.json ./
RUN npm install

# Copy backend package.json and install backend dependencies
COPY backend/package*.json ./backend/
RUN cd backend && npm install

# Copy all files
COPY . .

EXPOSE 3001
CMD ["node", "backend/server.js"]