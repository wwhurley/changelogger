var nconf = require('nconf');

nconf.argv().env();

nconf.defaults({
  'NODE_ENV': 'local'
});

nconf.defaults({
  'environment': nconf.get('NODE_ENV')
}); 

nconf.file('config/' + nconf.get('environment') + '.json');

module.exports = nconf;