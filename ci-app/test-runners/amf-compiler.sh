#!/usr/bin/env bash

set -e

# This script is mean to be executed in a container as root.
# It will fail without running this as root.

BRANCH=$1

# git clone https://github.com/aml-org/amf.git

cd amf/

git checkout ${BRANCH}

echo "Building AMF client library."
sbt clientJS/fullOptJS
echo "Executing buildjs.sh from AMF project"
./amf-client/js/build-scripts/buildjs.sh

echo "Copying AMF library to the working location."
cd ../

mkdir "lib"
mkdir "lib/bin"

cp amf/amf-client/js/amf.js lib/
cp amf/amf-client/js/package.json lib/
cp amf/amf-client/js/bin/amf lib/bin/

echo "Installing AMF project dependencies"
cd lib/
npm i
