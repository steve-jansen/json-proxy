#!/usr/bin/env bash

git config --global user.email "builds@travis-ci.com"
git config --global user.name "Travis CI"

APP_TAG="v`node -p 'require("package.json").version'`"

echo $0: tagging commit ${TRAVIS_COMMIT} as ${APP_TAG}
git tag "${APP_TAG}" "${TRAVIS_COMMIT}"

echo $0: updating release branch to commit ${TRAVIS_COMMIT}
git branch -f release "${TRAVIS_COMMIT}"

echo $0: pushing tags and release branch
git push -q origin "${APP_TAG}"

echo $0: version bumping
npm version minor -m "Version bump by Travis CI"
git push -q origin master

