var github = require('octonode');
var logger = require('../logger');
var config = require('../config');
var Q = require('q');

var client = github.client(config.get('github'));

module.exports = {
  sendRequest : function(path, params) {
    var defer = Q.defer();

    logger.debug('github: request starting ' + path + ' | '
        + JSON.stringify(params));

    client.get(path, params, function(err, status, body, headers) {
      if (err) {
        logger.debug('github: request failed ' + path + ' | '
            + JSON.stringify(params));
        defer.reject({
          err : err,
          status : status,
          body : body,
          headers : headers
        });
      } else {
        logger.debug('github: request succeeded ' + path + ' | '
            + JSON.stringify(params));
        defer.resolve({
          status : status,
          body : body,
          headers : headers
        });
      }
    });

    return defer.promise;
  },
  getProjects : function(since) {
    return this.sendRequest('/repositories', {
      since : since
    });
  }
}