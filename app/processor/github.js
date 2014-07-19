var amqp = require('amqp');
var github = require('../network/github');
var projects = require('../models/project');
var settings = require('../models/settings');
var _ = require('underscore');
var logger = require('../logger');
var config = require('../config');
var Step = require('step');

module.exports = {
  connect : function() {
    logger.debug('github: starting');
    
    var connection = amqp.createConnection(config.get('amqp'));

//    Step(
//      function openConnection() {
//        logger.debug('github: connecting');
//        
//        connection.on('ready', this);
//      },
//      function createExchange() {
//        logger.debug('github: creating exchange');
//        
//        connection.exchange('changelogger', {
//          type : 'direct',
//          durable : true,
//          autoDelete : false,
//          confirm : true
//        }, this);
//      },
//      function createQueue(ex) {
//        var exchange = ex;
//        
//        logger.debug('github: creating queue');
//        
//        connection.queue('github', {
//          durable: true,
//          autoDelete : false
//        }, this);
//      },
//      function bindQueue(q) {
//        var queue = q;
//        
//        logger.debug('github: binding queue');
//        queue.bind(exchange, 'github');
//        queue.on('queueBindOk', this);
//      },
//      function queueSubscribe() {
//        logger.debug('github: subscribing queue');
//        
//        queue.subscribe(this);
//      },
//      function receiveMessage(message, headers, deliveryInfo, messageObject) {
//        logger.debug('github: receive message: ' + JSON.stringify(message));
//      }
//    );
    connection.on('ready', function() {
      logger.debug('github: connection ready');
      connection.exchange('changelogger', {
        type : 'direct',
        durable : true,
        autoDelete : false,
        confirm : true
      }, function(exchange) {
        connection.queue('github', {
          durable : true,
          autoDelete : false
        }, function(q) {
          logger.debug('github: queue created');
          q.bind(exchange, 'github');
          logger.debug('github: queue bound');
          q.subscribe(function(message, headers, deliveryInfo, messageObject) {
            logger.debug('github: message received: ' + JSON.stringify(message));
            
            logger.debug('github: loading settings');
            settings.load('github', function(err, setting_values) {
              var since = 0;
              setting_values = setting_values || {
                category : 'github',
                data : {}
              };
  
              if (!err) {
                since = (_.has(setting_values.data, 'since')) ? setting_values.data.since : 0;
              }
  
              github[message.action](message, {
                since : since
              }, function(err, status, body, headers) {
                if (!err) {
                  _.each(body, function(project) {
                    projects.upsert({
                      provider : 'github',
                      name : project.name,
                      owner : project.owner.login,
                      slug : project.owner.login + '/' + project.name,
                      data : project
                    }, function(err, document) {
                    });
                  });
  
                  if (_.has(headers, 'link')) {
                    var since_match = headers.link.match(/since=(\d+)/);
                    if (2 <= since_match.length) {
                      setting_values.data.since = since_match[1];
                      logger.debug('github: saving settings');
                      settings.save('github', setting_values.data, function(err, doc) {
                        if (!err) {
                          if (_.has(headers, 'x-ratelimit-remaining') && 0 < headers['x-ratelimit-remaining']) {
                            connection.publish('github', {
                              action : 'getProject'
                            });
                          }
                          else {
                            var limit_reset = new Date((headers['x-ratelimit-reset'] * 1000) + 10000);
                            logger.info('Waiting until: ' + Date.toString());
                            
                            setTimeout(function() {
                              connection.publish('github', {
                                action : 'getProject'
                              });
                            }, (limit_reset.getTime() - Date.now()));
                          }
                        }
                        else {
                          logger.error(err);
                        }
                      });
                    }
                  }
                  ;
                } else {
                  logger.error(err);
                }
              });
            });
          });
        });
      });
    });
  }
}
