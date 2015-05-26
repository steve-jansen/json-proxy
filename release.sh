#!/usr/bin/env bash

APP_TAG="v`node -p 'require("./package.json").version'`"
GIT_COMMIT=`git rev-parse HEAD`

echo $0: git reseting
git reset --hard HEAD

echo $0: tagging commit ${GIT_COMMIT} as ${APP_TAG}
git tag "${APP_TAG}" "${GIT_COMMIT}"

echo $0: version bumping
npm version patch -m 'Version bump to %s' --no-git-tag-version

echo $0: pushing tags and master
git push -q origin master --tags

