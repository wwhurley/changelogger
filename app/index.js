var amqp = require('amqp');
var logger = require('./logger');
var config = require('./config');
var Step = require('step');
var projects = require('./models/project');
var mongoose = require('mongoose');
var _ = require('underscore');

mongoose.connect('mongodb://' + config.get('database:host') + '/' + config.get('database:database'));
var db = mongoose.connection;

db.on('error', console.error.bind(console, 'connection error:'));

logger.debug('opening database');

db.once('open', function() {
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
    projects.findCheckReleases(new Date(), 1000, 0).then(function(documents) {
      _.each(documents, function(project) {
        project.checkReleases = new Date();
        project.checkReleases.setHours(project.checkReleases.getHours() + 24);

        project.save(function(err) {
          if (!err) {
            exchange.publish('github', {
              action : 'getReleases',
              data : project
            });
          }
        });
      });
    }).fail(function(err) {
      console.log(err);
    });
  });
});

//var connection = amqp.createConnection(config.get('amqp'));
//
//Step(function openConnection() {
//  logger.debug('index: connecting');
//
//  connection.on('ready', this);
//}, function createExchange() {
//  logger.debug('index: creating exchange');
//
//  connection.exchange('changelogger', {
//    type : 'direct',
//    durable : true,
//    autoDelete : false,
//    confirm : true
//  }, this);
//}, function sendMessage(exchange) {
//  logger.debug('index: sending message');
//  exchange.publish('github', {
//    action : 'getProjects',
//    since : config.get('github:since') || 0
//  });
//});