var crypto = require('crypto');
var through = require('through2');

var GLOBAL_CACHE = {};

module.exports = function (options) {
  var cache = options.cache || GLOBAL_CACHE;
  var passNew = options.passNew !== false;

  return through.obj(function (file, encoding, done) {
    var newHash = crypto.createHash('sha1').update(file.contents).digest('hex');
    var currentHash = cache[file.path];

    if ((!currentHash && passNew) || (currentHash && currentHash !== newHash)) {
      this.push(file);
    }

    cache[file.path] = newHash;

    done();
  });
};
