const path = require('path');
const globby = require('globby');
const pathToRegexp = require('path-to-regexp');

const verbRegExp = /([a-zA-Z]*?)?_.+/i;

function getMock(file) {
  const ext = path.extname(file);
  let basename = path.basename(file, ext);
  const set = path.extname(basename);

  if (set) {
    basename = path.basename(basename, set);
  }

  const dirComponents = path
    .dirname(file)
    .split(path.delimiter)
    .filter(c => c && c !== '.');
  const fileComponents = basename.split('#').filter(c => c);
  let method = null;
  const match = fileComponents[0].match(verbRegExp);

  if (match) {
    method = match[1];
    fileComponents[0] = fileComponents[0].substring(method.length + 1);
  }

  const reqPath = dirComponents.concat(fileComponents).join('/');
  const keys = [];

  return {
    file,
    ext: ext ? ext.substring(1).toLowerCase() : ext,
    set: set ? set.substring(1) : set,
    method: method ? method.toLowerCase() : method,
    reqPath,
    regexp: pathToRegexp(reqPath, keys),
    keys
  };
}

async function getMocks(basePath) {
  const mockFiles = await globby(['**/*'], {cwd: basePath});
  return mockFiles.map(getMock);
}

module.exports = {
  getMocks,
  getMock
};