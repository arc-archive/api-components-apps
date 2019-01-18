# Dockerfile extending the generic Node image with application files for a
# single application.
FROM gcr.io/google_appengine/nodejs

# Check to see if the the version included in the base runtime satisfies
# '>=8.12.0', if not then do an npm install of the latest available
# version that satisfies it.
RUN /usr/local/bin/install_node '>=8.12.0'

# Java

ENV JAVA_HOME /usr/java/openjdk-11
ENV PATH $JAVA_HOME/bin:$PATH

# http://jdk.java.net/
ENV JAVA_VERSION 11.0.1
ENV JAVA_URL https://download.java.net/java/GA/jdk11/13/GPL/openjdk-11.0.1_linux-x64_bin.tar.gz
ENV JAVA_SHA256 7a6bb980b9c91c478421f865087ad2d69086a0583aeeb9e69204785e8e97dcfd

RUN set -eux; \
	\
	curl -fL -o /openjdk.tgz "$JAVA_URL"; \
	echo "$JAVA_SHA256 */openjdk.tgz" | sha256sum -c -; \
	mkdir -p "$JAVA_HOME"; \
	tar --extract --file /openjdk.tgz --directory "$JAVA_HOME" --strip-components 1; \
	rm /openjdk.tgz; \
	\
# https://github.com/oracle/docker-images/blob/a56e0d1ed968ff669d2e2ba8a1483d0f3acc80c0/OracleJava/java-8/Dockerfile#L17-L19
	ln -sfT "$JAVA_HOME" /usr/java/default; \
	ln -sfT "$JAVA_HOME" /usr/java/latest; \
#	for bin in "$JAVA_HOME/bin/"*; do \
#		base="$(basename "$bin")"; \
#		[ ! -e "/usr/bin/$base" ]; \
#		alternatives --install "/usr/bin/$base" "$base" "$bin" 20000; \
#	done; \
	\
# https://github.com/docker-library/openjdk/issues/212#issuecomment-420979840
# http://openjdk.java.net/jeps/341
	java -Xshare:dump; \
	\
# basic smoke test
	java --version; \
	javac --version


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
apt-get update && \
apt-get install sbt && \
sbt sbtVersion && \
mkdir project && \
echo "scalaVersion := \"${SCALA_VERSION}\"" > build.sbt && \
echo "sbt.version=${SBT_VERSION}" > project/build.properties && \
echo "case object Temp" > Temp.scala && \
sbt compile && \
rm -r project && rm build.sbt && rm Temp.scala && rm -r target

# Install xvfb
RUN \
apt-get install -y xvfb

# Install global npm packages used by the app.
RUN \
npm install -g polymer-cli istanbul wct-istanbub --unsafe-perm

COPY . /app/

# You have to specify "--unsafe-perm" with npm install
# when running as root.  Failing to do this can cause
# install to appear to succeed even if a preinstall
# script fails, and may have other adverse consequences
# as well.
# This command will also cat the npm-debug.log file after the
# build, if it exists.
RUN npm install --unsafe-perm || \
  ((if [ -f npm-debug.log ]; then \
      cat npm-debug.log; \
    fi) && false)
CMD npm start
