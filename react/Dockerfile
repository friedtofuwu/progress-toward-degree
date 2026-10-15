# => Build container
FROM node:16 as build

WORKDIR /app

# install dependencies (production)
COPY package.json .
RUN npm install --omit="dev"

# add source code
COPY . .

RUN npm run build

# => Run container
FROM nginx:1.16.0

COPY --from=build /app/build /usr/share/nginx/html

RUN rm /etc/nginx/conf.d/default.conf
COPY nginx/nginx.conf /etc/nginx.conf.template

# expose app on port
EXPOSE 80

# Start nginx server
CMD [ "/bin/bash", "-c", "envsubst '${REACT_PORT} ${SITE_URL}' < /etc/nginx.conf.template > /etc/nginx/conf.d/nginx.conf && nginx -g \"daemon off;\"" ]
