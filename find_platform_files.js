'use strict';

var url = require('url');

var redis = require('redis');

var platformFiles = require('./platform_files');
var logging = require('./logging');

var log = logging.setup(__filename);

process.on('message', function(msg) {
  log.debug('Received a request from mommy and daddy: %s', JSON.stringify(msg));
  var pfFiles = platformFiles.all(msg.branch, function(err, contents) {
    if (err) {
      log.error(err, 'Figuring out platform files');
      process.send({err: err});
    } else {
      process.send({contents: contents});
    }
  })
});
