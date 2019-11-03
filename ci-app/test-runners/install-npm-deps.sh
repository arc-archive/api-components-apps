#!/usr/bin/env bash

set -e

# the sctipt install npm dependencies + dev dependencies

BUILD_DIR=$1

cd $BUILD_DIR

npm i
echo "Installoing dev dependencies..."
npm i --only=dev
echo "Dependencies are installed."
