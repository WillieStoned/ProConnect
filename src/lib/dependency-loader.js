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
  const fromRoot = tryLoadFrom(ROOT_DIR, ROOT_NODE_MODULES, name);
  if (fromRoot) {
    return fromRoot;
  }

  const fromServer = tryLoadFrom(SERVER_DIR, SERVER_NODE_MODULES, name);
  if (fromServer) {
    return fromServer;
  }

  throw new Error(
    `Unable to resolve dependency "${name}". Install dependencies in repo root or in Server/.`
  );
}

module.exports = { loadDependency };
