'use strict';

const slugify = require('slugify');

const slugUtils = {};

/**
 * Parse slugify
 * @param {String} data
 * @param {Object} options
 * @see https://www.npmjs.com/package/slugify
 */
function _parseSlug(data = '', options = { lower: true }) {
  return slugify(data, options);
}

slugUtils.parseSlug = _parseSlug;

module.exports = slugUtils;
