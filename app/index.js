var amqp = require('amqp');
var logger = require('./logger');
var config = require('./config');
var Step = require('step');

var connection = amqp.createConnection(config.get('amqp'));

Step(function openConnection() {
  logger.debug('index: connecting');

  connection.on('ready', this);
}, function createExchange() {
  logger.debug('index: creating exchange');

  connection.exchange('changelogger', {
    type : 'direct',
    durable : true,
    autoDelete : false,
    confirm : true
  }, this);
}, function sendMessage(exchange) {
  logger.debug('index: sending message');
  exchange.publish('github', {
    action : 'getProjects',
    since : config.get('github:since') || 0
  });
});