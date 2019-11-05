FROM launcher.gcr.io/google/nodejs
RUN install_node v12.13.0

COPY . /app/

RUN npm install --unsafe-perm || false

CMD ["npm","start"]
