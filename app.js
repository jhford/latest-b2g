'use strict';

var path = require('path');
var fork = require('child_process').fork;
var fs = require('fs');

var restify = require('restify');

//var pf = require('./platform_files');
var logging = require('./logging');
var log = logging.setup(__filename);

var server = restify.createServer();

var cacheFile = 'cache.json';
var cache = {};

if (fs.existsSync(cacheFile)) {
  log.info('Reading cache from file');
  try {
    cache = JSON.parse(fs.readFileSync(cacheFile));
    log.info('Read cached data');
  } catch (e) {
    var brokenFileName = cacheFile + '-broken-' + String(Date.now())
    fs.renameSync(cacheFile, brokenFileName);
    log.info('There was an invalid cache file, moved to %s', brokenFileName);
  }
}

// Maximum age in the cache in minutes
var maxAge = process.env.MAX_CACHE_AGE || 20;

function store(branch, data) {
  log.info('Storing updated data for %s in the cache', branch);
  cache[branch] = {
    lastFetched: Date.now(),
    data: data
  };
  fs.writeFileSync(cacheFile, JSON.stringify(cache, null, 2));
}

function fetch(branch, callback) {
  var child = fork(path.join(__dirname, 'find_platform_files.js'));

  child.on('error', function(err) {
    log.error(err, 'Error in child process');
    callback(err);
  });

  child.on('message', function(msg) {
    child.kill();
    callback(null, msg.contents);
  });

  try {
    child.send({branch: branch});
  } catch (err) {
    log.error(err, 'Error in child process');
    callback(err);
  }
}

function retreive(branch, callback) {
  if (!cache[branch] || (Date.now() - cache[branch].lastFetched) >= 1000 * 60 * maxAge) {
    log.info('Data missing or expired in cache, fetching');
    fetch(branch, function(err, data) {
      if (err) {
        log.error(err, 'Non-fatal error');
        if (cache[branch]) {
          log.info('I have a previous version, returning that');
          callback(null, cache[branch].data);
        }
        else {
          callback(new Error('I have no possible data to return'));
        }
      }
      store(branch, data);
      callback(null, data);
    });
  } else if (cache[branch].data) {
    log.info('Data found in the cache, returning');
    callback(null, cache[branch].data)
  } else {
    callback(new Error('Missing data from cache'));
  }
}

function getForBranch(req, res, next) {
  retreive(req.params.branch, function(err, data) {
    if (err) {
      res.send(500, err);
      next();
    }
    res.send(200, data);
  });
}

server.get('/branch/:branch', getForBranch);
server.head('/branch/:branch', getForBranch);

server.get('/', function(req, res, next) {
  res.send(200, 'Hello');
  next();
});

server.get('/full-cache', function(req, res, next) {
  res.send(200, cache);
  next();
});

var port = process.env.PORT || 7400;
server.listen(port, function () {
  log.info('Set up server on port %s', port);
});
