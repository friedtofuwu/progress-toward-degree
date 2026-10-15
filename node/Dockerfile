FROM node:16

WORKDIR /app

# install dependencies
COPY package.json .
RUN npm install --omit="dev"

# add source code
COPY . .

# expose app on port
EXPOSE 5000

# command to run app
CMD [ "npm", "start" ]
