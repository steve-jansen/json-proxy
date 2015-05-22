# Changelog
All notable changes to https://www.npmjs.org/package/json-proxy will be documented in this file.


## 0.4.0 - 2015-05-22

### Added
- Support for overrideing the `Host` and `Via` request headers.
- Continuous Delivery to npm via Travis CI

### Deprecated
- Nothing.

### Removed
- Nothing.

### Fixed
- npm-shrinkwrap was out of date for v0.3.x
- Minor improvements to test suites structure


## 0.3.1 - 2015-03-18

### Added
- Nothing.

### Deprecated
- Nothing.

### Removed
- Nothing.

### Fixed
- Update dependencies
- Add Node 0.12 to Travis CI builds to verify compatability
- Minor documentation and style fixes


## 0.3.0 - 2014-08-01

### Added
- this CHANGELOG, thanks to http://keepachangelog.com/
- forwarding rules now support URL rewriting via nginx style regex captures
- injected headers can now use a function that accepts the req object and
  returns a simple string
- reuse the same unit test suites for proxying with and without a LAN HTTP proxy
- resolved codeclimate complexity warnings
- additional keywords in package.json for SEO with grunt plugins

### Deprecated
- Nothing.

### Removed
- Dropped support for parsing the v0.0.1 configuration format.  This means
  that top level configuration values must be inside a `server` or `proxy`
  configuration block.

### Fixed
- Restored express as a package dependency for `npm install -g json-proxy`.
- Fixed checks for `undefined` and `null` introduced by jshint fixes.


## 0.2.0 - 2014-07-15

### Added
- support for use as grunt middleware
- examples for running a proxy url inside `grunt serve`;
  see gruntjs/grunt-contrib-connect#85
- support for proxying to SSL/TLS endpoints
- support for basic authentication against HTTP proxy gateways;
  which is common on large LAN environments (e.g., corporations, universities);
  see v0.0.3
- internal refactoring to use the latest nodejitsu http-proxy bits
  (http-proxy@1.1.x); http-proxy@1.0 was a "from-scratch" implementation of
  the proxy core by nodejitsu, leaving http-proxy@0.x no longer supported
- general housekeeping: better unit test coverage, resolved jshint issues

### Deprecated
- Nothing.

### Removed
- Nothing.

### Fixed
- Nothing.


## 0.1.2  - 2014-01-25

### Added
- updated dependencies to use optimist@0.6.0

### Deprecated
- Nothing.

### Removed
- Nothing.

### Fixed
- version of http-proxy dependency in package.json
- froze http-proxy dependency at last release prior to http-proxy@1.0,
  which introduced breaking API changes
- script path in the CLI example shell scripts

## 0.1.1  - 2013-10-21

### Added

### Deprecated
- Nothing.

### Removed
- Nothing.

### Fixed
- typo in package.json


## 0.1.0  - 2013-08-01

### Added
- support for using json-proxy as express middleware
- CLI support for [AngularJS's html5mode](https://docs.angularjs.org/guide/$location)
- more robust configuration:
  - hierarchical fallback (from highest to lowest prioirty):
    - hard coded config values
    - command line options
    - config file options
    - environmental variables
    - json-proxy defaults
- proper support for `npm -g` installs
- mocha unit test and jshint linting
- examples for both CLI and middleware use cases
- an npm-shrinkwrap.json file

### Deprecated
- Nothing.

### Removed
- Nothing.

### Fixed
- Nothing.

## 0.0.5  - 2013-04-02

### Added

### Deprecated
- CLI banner changed from deprecated product name `api-proxy` to `json-proxy`

### Removed
- Nothing.

### Fixed
- using the node-static middleware with NodeJS 0.10.*
- config file argument and file not found errors

## 0.0.3  - 2013-04-02

### Added
- support for storing config in json files to simplify CLI usage
- configuration files will replace the token `$config` with 
  the normalized path to the config file on disk
- support for custom headers, which is useful for endpoints that
  require reverse proxy authentication via headers
- support for connecting via HTTP proxy server gateways,
  which is common on large LAN environments (e.g., corporations, universities)

### Deprecated
- Nothing.

### Removed
- Nothing.

### Fixed
- Nothing.


## 0.0.1  - 2013-02-28

### Added
- alpha release as CLI utility
- a static file web server for UI developers that proxies JSON API calls to one
  or more remote web servers.

### Deprecated
- Nothing.

### Removed
- Nothing.

### Fixed
- Nothing.
