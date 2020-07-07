'use strict';
module.exports = {
  extends: [ 'eslint-config-egg' ],
  env: {
    browser: true,
    commonjs: true,
    es6: true,
    node: true,
  },
  rules: {
  },
  globals: {
    fetch: true,
  },
};
