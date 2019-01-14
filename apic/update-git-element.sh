#!/usr/bin/env bash

set -e
BUILD_DIR=$1
COMPONENT=$2
echo " "
echo "  Updating $COMPONENT component in the build folder"

if [ -z "$COMPONENT" -a "${COMPONENT+xxx}" = "xxx" ]; then
  echo "  Component name not set. Unable to continue."
  exit 1;
fi

cd $BUILD_DIR
echo "  Cloning component"
git clone "https://github.com/advanced-rest-client/${COMPONENT}.git"
cd $COMPONENT
git checkout stage
