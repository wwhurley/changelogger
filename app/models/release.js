var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var Q = require('q');
var logger = require('../logger');

var releaseSchema = new Schema({
  name : String,
  description : String,
  date : Date,
  project : mongoose.Schema.Types.ObjectId,
  data : mongoose.Schema.Types.Mixed
});

var model = mongoose.model('Release', releaseSchema);

module.exports = {
  findByProjectId : function(projectId) {
    var defer = Q.defer();
    
    model.find({
      project : projectId
    }, function(documents) {
      promise.resolve(documents);
    });
    
    return defer.promise;
  },
  upsert : function(release) {
    var defer = Q.defer();

    model.findOneAndUpdate({
      project : release.project,
      name : release.name
    }, release, {
      upsert : true
    }, function(err, document) {
      if (err) {
        logger.error('release: failed upserting ' + release.name + ' for ' + release.project);
        defer.reject(err);
      }
      else {
        logger.debug('release: upserted ' + release.name + ' for ' + release.project);
        defer.resolve(document);
      }
    });
    
    return defer.promise;
  }
}