var nconf = require('nconf');
require('nconf-redis');

nconf.argv().env();

nconf.defaults({
  'NODE_ENV': 'local'
});

nconf.defaults({
  'environment': nconf.get('NODE_ENV')
}); 

nconf.file('config/' + nconf.get('environment') + '.json');

nconf.use('redis', nconf.get('redis'));

module.exports = nconf;