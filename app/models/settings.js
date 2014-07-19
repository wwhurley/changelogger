var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var settingsSchema = new Schema({
  category : String,
  data : mongoose.Schema.Types.Mixed
});

var model = mongoose.model('Settings', settingsSchema);

module.exports = {
  load : function(category, callback) {
    model.findOne({
      category : category
    }, callback);
  },
  save : function(category, data, callback) {
    model.findOneAndUpdate({
      category : category
    }, {
      category : category,
      data : data
    }, {
      upsert : true
    }, callback);
  }
}