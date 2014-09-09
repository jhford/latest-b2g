'use strict';

var path = require('path');
var fork = require('child_process').fork;

var restify = require('restify');
var uuid = require('uuid');

//var pf = require('./platform_files');
var logging = require('./logging');
var log = logging.setup(__filename);

var child = fork(path.join(__dirname, 'find_platform_files.js'));

child.once('error', function(err) {
  log.error(err, 'Error in child process');
  process.exit(1);
});

child.once('disconnect', function() {
  log.error('Child disconnected');
  process.exit(1);
});

var server = restify.createServer();

function getForBranch(req, res, next) {
  log.info('Finding information for branch %s', req.params.branch);
  var token = uuid.v4();

  var listener = function (msg) {
    if (msg.token === token) {
      log.info('Received the message we were waiting for %', token);
      res.send(msg.contents);
      child.removeListener('message', listener);
    } else {
      log.info('Received a message for another consumer %s', msg.token);
    }
  }

  child.on('message', listener); 

  try {
    child.send({branch: req.params.branch, token: token});
  } catch (err) {
    log.error(err, 'Error in child process');
    res.send(500, 'Error!');
    process.exit(1);
  }
}

server.get('/branch/:branch', getForBranch);
server.head('/branch/:branch', getForBranch);

var port = process.env.PORT || 7400;
server.listen(port, function () {
  log.info('Set up server on port %s', port); 
});
