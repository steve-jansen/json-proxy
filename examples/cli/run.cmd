@ECHO OFF
SETLOCAL ENABLEEXTENSIONS

SET script_path=%~dp0
PUSHD "%script_path%" >NUL
SET script_path=%CD%
POPD >NUL

PUSHD "%script_path%/../.." >NUL

node bin/json-proxy -c examples/cli/json-proxy.json --html5mode

POPD >NUL

EXIT /B 0
