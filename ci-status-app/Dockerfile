FROM gcr.io/google_appengine/nodejs
RUN /usr/local/bin/install_node '>=8.12.0'

COPY . /app/

RUN npm install --unsafe-perm || false

CMD npm start
