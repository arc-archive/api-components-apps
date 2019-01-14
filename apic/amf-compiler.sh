#!/usr/bin/env bash

# set -eu

# This script is mean to be executed in a container as root.
# It will fail without running this as root.

BUILD_DIR=$1
BRANCH=$2
COMMIT_SHA=$3

AMF_DIR="${BUILD_DIR}/amf/"

mkdir ${AMF_DIR}
mkdir "${AMF_DIR}/src/"
mkdir "${AMF_DIR}/lib/"
mkdir "${AMF_DIR}/lib/bin"
cd $AMF_DIR

git clone --depth=50 --branch=$BRANCH https://github.com/aml-org/amf.git src

cd src
if [ -z ${var+x} ]; then
  git checkout ${BRANCH}
else
  git checkout ${COMMIT_SHA}
fi

echo "Building AMF client library."
sbt clientJS/fullOptJS
./amf-client/js/build-scripts/buildjs.sh

echo "Copying AMF library to the working location."
cd ../

cp src/amf-client/js/amf.js lib/
cp src/amf-client/js/package.json lib/
cp src/amf-client/js/bin/amf lib/bin/

echo "Installing project dependencies"
cd lib/
npm i

# echo "Linking global library".
# cd lib/
# npm link
#sudo chown -R $USER $BUILD_DIR/lib
