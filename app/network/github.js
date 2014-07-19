var github = require('octonode');
var logger = require('../logger');
var config = require('../config');

var client = github.client(config.get('github'));

module.exports = {
  getProject : function(message, params, callback) {
    logger.debug('starting: /repositories : ' + JSON.stringify(params));
    
    client.get('/repositories', params, function(err, status, body, headers) {
      callback(err, status, body, headers);
      
      logger.debug('finished: /repositories : ' + JSON.stringify(params));
    });
  }
}