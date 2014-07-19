var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var Q = require('q');
var logger = require('../logger');

var projectSchema = new Schema({
  name : String,
  provider : String,
  owner : String,
  slug : String,
  data : mongoose.Schema.Types.Mixed
});

var model = mongoose.model('Project', projectSchema);

module.exports = {
  find : function(provider, slug) {
    var defer = Q.defer();
    
    model.find({
      provider : provider,
      slug : slug
    }, function(documents) {
      promise.resolve(documents);
    });
    
    return defer.promise;
  },
  upsert : function(project) {
    var defer = Q.defer();

    model.findOneAndUpdate({
      provider : project.provider,
      slug : project.slug
    }, project, {
      upsert : true
    }, function(err, document) {
      if (err) {
        logger.error('project: failed upserting ' + project.provider + '/' + project.slug);
        defer.reject(err);
      }
      else {
        logger.debug('project: upserted ' + project.provider + '/' + project.slug);
        defer.resolve(document);
      }
    });
    
    return defer.promise;
  }
}