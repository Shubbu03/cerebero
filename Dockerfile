FROM node:22-alpine

WORKDIR /app

COPY /package.json /package.json
COPY /package-lock.json /package-lock.json

RUN npm install
RUN npm install -g typescript

COPY . .

RUN npm run build

EXPOSE 3000

CMD [ "npm", "run", "start" ]