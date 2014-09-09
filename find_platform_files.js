'use strict';

var platformFiles = require('./platform_files');
var logging = require('./logging');

var log = logging.setup(__filename);

process.on('message', function(msg) {
  log.debug('Received a request from mommy and daddy: %s', JSON.stringify(msg));
  log.info('Working on token %s', msg.token);
  var pfFiles = platformFiles.all(msg.branch, function(err, contents) {
    if (err) {
      log.error(err, 'Figuring out platform files');
      process.send({err: err});
    } else {
      log.info('Found platform files for request token %s', msg.token);
      process.send({contents: contents, token: msg.token});
    }
  })
});
