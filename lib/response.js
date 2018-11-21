const path = require('path');
const fs = require('fs-extra');

const {render} = require('./template');

function getResponseDetails(response) {
  const details = {
    statusCode: 200,
    headers: {},
    body: null
  };
  const hasProperty = response.hasOwnProperty.bind(response);

  if (typeof response === 'object' && hasProperty('statusCode') && hasProperty('headers') && hasProperty('body')) {
    details.statusCode = response.statusCode || details.statusCode;
    details.body = response.body === undefined ? null : response.body;
  } else {
    details.body = response;
  }

  return details;
}

function internalError(res, message, error) {
  res.status(500).send(error ? `${message}: ${error.message}` : message);
}

async function respondMock(res, mock, data, basePath) {
  const isTemplate = mock.ext.endsWith('_');
  const ext = isTemplate ? mock.ext.substring(0, mock.ext.length - 1) : mock.ext;
  let result;

  // Response depends of input file type:
  // - JavaScript files are fed with request data
  // - JS/JSON files can customize response status code and headers
  // - Templates files are processed
  // - If not set, response type is derived from input file extension

  if (isTemplate || ext === 'json') {
    try {
      result = await fs.readFile(path.join(basePath, mock.file), 'utf-8');
    } catch (error) {
      return internalError(res, `Error while reading mock file "${mock.file}"`, error);
    }

    if (isTemplate) {
      try {
        result = render(result, data);
      } catch (error) {
        return internalError(res, `Error while processing template for mock file "${mock.file}"`, error);
      }
    }

    if (ext === 'json') {
      try {
        result = JSON.parse(result);
      } catch (error) {
        return internalError(res, `Error while parsing JSON for mock "${mock.file}"`, error);
      }
    }
  } else if (ext === 'js') {
    try {
      const filePath = path.join(process.cwd(), basePath, mock.file);
      result = require(filePath)(data);
    } catch (error) {
      return internalError(res, `Error while evaluating JS for mock "${mock.file}"`, error);
    }
  } else {
    try {
      // Read file as buffer
      result = await fs.readFile(path.join(basePath, mock.file));
    } catch (error) {
      return internalError(res, `Error while reading mock file "${mock.file}"`, error);
    }
  }

  const details = getResponseDetails(result);
  const needType =
    Object.getOwnPropertyNames(details.headers)
      .map(String.prototype.toLowerCase)
      .find(h => h === 'content-type') === undefined;

  if (needType && mock.ext) {
    res.type(mock.ext);
  }

  res.status(details.statusCode).set(details.headers);

  if (details.body === null) {
    res.end();
  } else {
    res.send(details.body);
  }
}

module.exports = {
  respondMock
};