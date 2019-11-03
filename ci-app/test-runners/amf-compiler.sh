#!/usr/bin/env bash

set -e

# This script is mean to be executed in a container as root.
# It will fail without running this as root.

BUILD_DIR=$1
BRANCH=$2
COMMIT_SHA=$3

AMF_DIR="${BUILD_DIR}/amf/"

echo "Building AMF library in $AMF_DIR"

mkdir ${AMF_DIR}
cd $AMF_DIR

git clone --depth=50 https://github.com/aml-org/amf.git src

cd src
if [ -z ${BRANCH+x} ]; then
  git checkout ${BRANCH}
else
  git checkout ${COMMIT_SHA}
fi

SHA=`git rev-parse HEAD`
CACHED_NAME="$SHA.tar.gz"
CACHED="$HOME/amf-cache/${CACHED_NAME}"

if test -f "$CACHED"; then
  cd ../
  tar -xzf $CACHED
else
  echo "Building AMF client library."
  sbt clientJS/fullOptJS
  echo "Executing buildjs.sh from AMF project"
  ./amf-client/js/build-scripts/buildjs.sh

  echo "Copying AMF library to the working location."
  cd ../

  mkdir "${AMF_DIR}/lib/"
  mkdir "${AMF_DIR}/lib/bin"

  cp src/amf-client/js/amf.js lib/
  cp src/amf-client/js/package.json lib/
  cp src/amf-client/js/bin/amf lib/bin/

  echo "Installing AMF project dependencies"
  cd lib/
  npm i
  cd ../
  echo "Caching commit to $CACHED"
  tar -czf $CACHED_NAME lib
  mkdir -p "$HOME/amf-cache/"
  cp $CACHED_NAME $CACHED
  rm $CACHED_NAME
fi
