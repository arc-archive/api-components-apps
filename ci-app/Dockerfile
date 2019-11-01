# Dockerfile extending the generic Node image with application files for a
# single application.
FROM launcher.gcr.io/google/nodejs

# Check to see if the the version included in the base runtime satisfies
# '>=8.12.0', if not then do an npm install of the latest available
# version that satisfies it.
# RUN /usr/local/bin/install_node '>=12.13.0'
RUN install_node v12.13.0

RUN apt-get update

#=========
# Chrome
#=========
RUN apt-get install -y curl
RUN curl -sL https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add -
RUN echo 'deb http://dl.google.com/linux/chrome/deb/ stable main' >> /etc/apt/sources.list.d/google.list
RUN apt-get update && apt-get install -y --no-install-recommends google-chrome-stable

# RUN CHROME_FILE=`whereis -b google-chrome | awk '{print $2}'` && \
#     cp $CHROME_FILE "$CHROME_FILE".old && \
#     cat "$CHROME_FILE".old | sed 's/exec -a "$0" "$HERE\/chrome" "$@"/exec -a "$0" "$HERE\/chrome" "$@" --no-default-browser-check --no-first-run --no-sandbox/' > $CHROME_FILE && \
#     rm "$CHROME_FILE".old


#============
# Java
#============
RUN apt-get update && apt-get install -y openjdk-8-jdk && \
# basic smoke test
	java -version; \
	javac -version


# Env variables
ENV SCALA_VERSION 2.12.8
ENV SBT_VERSION 1.2.7

# Install Scala
## Piping curl directly in tar
RUN \
  curl -fsL https://downloads.typesafe.com/scala/$SCALA_VERSION/scala-$SCALA_VERSION.tgz | tar xfz - -C /root/ && \
  echo >> /root/.bashrc && \
  echo "export PATH=~/scala-$SCALA_VERSION/bin:$PATH" >> /root/.bashrc

# Install sbt
RUN \
  curl -L -o sbt-$SBT_VERSION.deb https://dl.bintray.com/sbt/debian/sbt-$SBT_VERSION.deb && \
  dpkg -i sbt-$SBT_VERSION.deb && \
  rm sbt-$SBT_VERSION.deb && \
  apt-get install sbt && \
  sbt sbtVersion && \
  mkdir project && \
  echo "scalaVersion := \"${SCALA_VERSION}\"" > build.sbt && \
  echo "sbt.version=${SBT_VERSION}" > project/build.properties && \
  echo "case object Temp" > Temp.scala && \
  sbt compile && \
  rm -r project && rm build.sbt && rm Temp.scala && rm -r target

COPY . /app/

RUN npm --unsafe-perm install

CMD npm start
