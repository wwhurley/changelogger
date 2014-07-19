var amqp = require('amqp');
var github = require('../network/github');
var projects = require('../models/project');
var releases = require('../models/release');
var _ = require('underscore');
var logger = require('../logger');
var config = require('../config');
var Q = require('q');

var connection;
var exchange;
var queue;

/**
 * Creates and opens the connection to the AMQP server
 */
var connectionOpen = function() {
  var defer = Q.defer();

  logger.debug('github: connection creating');

  connection = amqp.createConnection(config.get('amqp'));

  logger.debug('github: connection created');

  connection.on('ready', function() {
    logger.debug('github: connection ready');
    defer.resolve();
  });

  return defer.promise;
};

/**
 * Creates the exchange
 */
var exchangeCreate = function() {
  var defer = Q.defer();

  logger.debug('github: exchange creating');

  // TODO: Switch exchange creation to emit-style
  connection.exchange('changelogger', {
    type : 'direct',
    durable : true,
    autoDelete : false,
    confirm : true
  }, function(ex) {
    logger.debug('github: exchange open');
    exchange = ex;
    defer.resolve();
  });

  return defer.promise;
};

/**
 * Creates the message queue
 */
var queueCreate = function() {
  var defer = Q.defer();

  logger.debug('github: queue creating');

  // TODO: Switch queue creation to emit-style
  connection.queue('github', {
    durable : true,
    autoDelete : false
  }, function(qu) {
    logger.debug('github: queue created');
    queue = qu;
    defer.resolve();
  });

  return defer.promise;
};

/**
 * Binds the queue to the exchange
 */
var queueBind = function() {
  var defer = Q.defer();

  queue.on('queueBindOk', function() {
    logger.debug('github: queue bound');
    defer.resolve();
  });

  logger.debug('github: queue binding');
  queue.bind(exchange, 'github');

  return defer.promise;
};

/**
 * Runs all necesary steps to connect to the message queue
 */
var queueReady = function() {
  var funcs = [ connectionOpen, exchangeCreate, queueCreate, queueBind ];
  return funcs.reduce(Q.when, Q());
};

/**
 * Process all projects
 * 
 * @param Array
 *          proj
 */
var processProjects = function(proj) {
  var upserts = [];

  _.each(proj, function(project) {
    upserts.push(projects.upsert({
      provider : 'github',
      name : project.name,
      owner : project.owner.login,
      slug : project.owner.login + '/' + project.name,
      data : project,
      checkReleases : new Date()
    }));
  });

  return Q.all(upserts);
};

var processReleases = function(project, rel) {
  var upserts = [];

  _.each(rel, function(release) {
    upserts.push(releases.upsert({
      project : project,
      name : release.name || release.tag_name,
      description : release.body,
      date : release.created_at,
      data : release
    }));
  });

  return Q.all(upserts);
};

/**
 * Validate that we're not rate limited
 * 
 * @param Object
 *          headers
 */
var canSendMoreRequest = function(headers) {
  var canSend = false;

  if (_.has(headers, 'x-ratelimit-remaining')
      && 0 < headers['x-ratelimit-remaining']) {
    logger.debug('github: ' + headers['x-ratelimit-remaining']
        + ' requests remaining');
    canSend = true;
  }

  return canSend;
};

/**
 * Determine the next since attribute from link headers
 */
var getProjectSince = function(headers) {
  var since_match = (_.has(headers, 'link')) ? headers.link
      .match(/since=(\d+)/) : null;
  var since = (since_match && 2 <= since_match.length) ? since_match[1] : null;

  return since;
};

/**
 * Send request to get next set of Projects
 */
var sendGetProjectRequest = function(since) {
  connection.publish('github', {
    action : 'getProjects',
    since : since
  });
}

module.exports = {
  connect : function() {
    queueReady().then(function() {
      queue.subscribe(function(message, headers, deliveryInfo, messageObject) {
        logger.info('github: received ' + message.action);
        module.exports[message.action](message).then(function() {
          logger.info('github: completed ' + message.action);
        }).fail(function() {
          logger.error('github: failed ' + message.action);
        });
      });
    });
  },
  getReleases : function(message) {
    var defer = Q.defer();

    github.getReleases(message.data.data.full_name).then(function(response) {
      processReleases(message.data._id, response.body).then(function() {
        defer.resolve();
      }).fail(function() {
        defer.reject();
      });
    }).fail(function() {
      defer.reject();
    });

    return defer.promise;
  },
  getProjects : function(message) {
    var defer = Q.defer();

    github.getProjects(message.since).then(function(response) {
      processProjects(response.body).then(function() {

        var since = getProjectSince(response.headers);

        logger.debug('github: next since ' + since);

        if (since) {
          // Check to see if we've been rate limited
          if (canSendMoreRequest(response.headers)) {
            config.set('github:since', since, function(err) {
              sendGetProjectRequest(since);
            });
          } else {
            logger.debug('github: rate limited');
            // Set a timeout to queue the next getProjects request
          }
          ;
        }

        defer.resolve();
      }).fail(function() {
        defer.reject();
      });
    }).fail(function(response) {
      defer.reject();
    });

    return defer.promise;
  }
}
