#!/bin/sh

readonly script_path=`cd ${0%/*} && echo $PWD`
readonly script_name=${0##*/}

pushd "$script_path" >/dev/null

if [ ! -d ./node_modules/jshint ]
then
	npm install jshint
fi

find ./lib -name "*.js" -print0 | xargs -0 node "./node_modules/jshint/bin/jshint" --show-non-errors

popd >/dev/null
