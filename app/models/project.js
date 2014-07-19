var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var projectSchema = new Schema({
  name : String,
  provider : String,
  owner : String,
  slug : String,
  data : mongoose.Schema.Types.Mixed
});

var model = mongoose.model('Project', projectSchema);

module.exports = {
  find : function(provider, slug, callback) {
    model.find({
      provider : provider,
      slug : slug
    }, callback);
  },
  upsert : function(project, callback) {
    model.findOneAndUpdate({
      provider : project.provider,
      slug : project.slug
    }, project, {
      upsert : true
    }, callback);
  }
}