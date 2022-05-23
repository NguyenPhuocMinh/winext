'use strict';

const buffer = require('buffer').Buffer;
const uuid = require('uuid');

const uuidUtils = {};

const generateRequestID = () => {
  return uuid.v4(null, buffer.alloc(16)).toString('base64').replace(/\//g, '_').replace(/\+/g, '-').substring(0, 22);
};

uuidUtils.generateRequestID = generateRequestID;
uuidUtils.v1 = uuid.v1();
uuidUtils.v4 = uuid.v4();

module.exports = uuidUtils;
