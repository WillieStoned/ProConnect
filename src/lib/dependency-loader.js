'use strict';

const path = require('path');

const ROOT_DIR = path.join(__dirname, '../..');
const ROOT_NODE_MODULES = path.join(ROOT_DIR, 'node_modules');
const SERVER_DIR = path.join(ROOT_DIR, 'Server');
const SERVER_NODE_MODULES = path.join(SERVER_DIR, 'node_modules');

function tryLoadFrom(baseDir, expectedPrefix, dependencyName) {
  try {
    const resolvedPath = require.resolve(dependencyName, { paths: [baseDir] });
    if (!resolvedPath.startsWith(expectedPrefix)) {
      return null;
    }
    return require(resolvedPath);
  } catch {
    return null;
  }
}

function loadDependency(name) {
  try {
    return require(name);
  } catch (err) {
    if (err.code && err.code !== 'MODULE_NOT_FOUND') {
      throw err;
    }

    const fromRoot = tryLoadFrom(ROOT_DIR, ROOT_NODE_MODULES, name);
    if (fromRoot) {
      return fromRoot;
    }

    const fromServer = tryLoadFrom(SERVER_DIR, SERVER_NODE_MODULES, name);
    if (fromServer) {
      return fromServer;
    }

    const explicitRootPath = path.join(ROOT_NODE_MODULES, name);
    try {
      return require(explicitRootPath);
    } catch {
      // ignore and continue fallback
    }

    const explicitServerPath = path.join(SERVER_NODE_MODULES, name);
    try {
      return require(explicitServerPath);
    } catch {
      // ignore and continue fallback
    }

    throw new Error(
      `Unable to resolve dependency "${name}". Install dependencies in repo root or in Server/.`
    );
  }
}

module.exports = { loadDependency };
