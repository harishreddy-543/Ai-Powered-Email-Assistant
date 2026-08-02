FROM node:18-alpine

WORKDIR /app

COPY package.json .

RUN npm install

COPY . .

EXPOSE 5173

# Run development server mapped to container host port
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]
