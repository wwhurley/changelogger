var mongoose = require('mongoose');
var logger = require('./logger');
var config = require('./config');

logger.debug('connecting to mongodb');

mongoose.connect('mongodb://' + config.get('database:host') + '/' + config.get('database:database'));
var db = mongoose.connection;
var github = require('./processor/github');

db.on('error', console.error.bind(console, 'connection error:'));

logger.debug('opening database');

db.once('open', function() {
  logger.debug('database opened');
  github.connect();
});