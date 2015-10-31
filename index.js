var crypto = require('crypto');
var through = require('through2');

var GLOBAL_CACHE = {};

module.exports = function(options) {
  options = options || {};

  var cache = options.cache || GLOBAL_CACHE;
  var firstPass = options.firstPass === true;

  return through.obj(function(file, encoding, done) {
    // null cannot be hashed
    if (file.contents === null) {
      // if element is really a file, something weird happened, but it's safer
      // to assume it was changed (because we cannot said that it wasn't)
      // if it's not a file, we don't care, do we? does anybody transform
      // directories?
      if (file.stat.isFile()) {
        this.push(file);
      }

      return done();
    }

    var newHash = crypto.createHash('sha1').update(file.contents).digest('hex');
    var currentHash = cache[file.path];
    cache[file.path] = newHash;

    if ((!currentHash && firstPass) || (currentHash && currentHash !== newHash)) {
      this.push(file);
    }


    done();
  });
};
