var path = require('path');
var fs = require('fs');
var assert = require('assert');
var concatStream = require('concat-stream');
var es = require('event-stream');
var gulp = require('gulp');
var changedInPlace = require('./');

describe('gulp-changed-in-place', function () {

  describe('when comparing by sha1 hash', function () {
    it('passes all files on start by default', function (done) {
      gulp.src('fixture/*')
        .pipe(changedInPlace({ firstPass: true, cache: {} }))
        .pipe(concatStream(function (buf) {
          assert.equal(2, buf.length);
          assert.equal('a', path.basename(buf[0].path));
          assert.equal('b', path.basename(buf[1].path));
          done();
        }));
    });

    it('does not pass all files on start with `firstPass: false`', function (done) {
      gulp.src('fixture/*')
        .pipe(changedInPlace({ firstPass: false, cache: {} }))
        .pipe(concatStream(function (buf) {
          assert.equal(0, buf.length);
          done();
        }));
    });

    it('should only pass through files when they change', function (done) {
      var shas = {};

      shas[path.join(__dirname, 'fixture/a')] = 'not matching sha';
      shas[path.join(__dirname, 'fixture/b')] = 'e9d71f5ee7c92d6dc9e92ffdad17b8bd49418f98';

      gulp.src('fixture/*')
        .pipe(changedInPlace({ firstPass: false, cache: shas }))
        .pipe(concatStream(function (buf) {
          assert.equal(1, buf.length);
          assert.equal('a', path.basename(buf[0].path));
          done();
        }));
    });

    it('should update cache before pushing file to stream', function (done) {
      var shas = {};

      gulp.src('fixture/*')
        .pipe(changedInPlace({ firstPass: true, cache: shas }))
        .pipe(es.map(function (file, callback) {
          // imitate gulp.dest without actualy writing files
          // @see https://github.com/gulpjs/vinyl-fs/blob/master/lib/prepareWrite.js#L24
          var targetBase = path.resolve(file.cwd, './build');
          var targetPath = path.resolve(targetBase, file.relative);
          file.base = targetBase;
          file.path = targetPath;
          callback(null, file);
        }))
        .pipe(concatStream(function (files) {
          assert.equal(2, files.length, 'should be 2 files');

          files.map(function (file) {
            assert.equal(undefined, shas[file.path], 'path of changed file should not be in cache');
          });

          done();
        }));
    });

    it('should use paths relative to `basePath`', function (done) {
      var shas = {};
      var basePath = __dirname;

      gulp.src('fixture/*')
        .pipe(changedInPlace({
          firstPass: true,
          basePath: basePath,
          cache: shas
        }))
        .pipe(concatStream(function (files) {

          files.map(function (file) {
            assert.equal(true, shas.hasOwnProperty(path.relative(basePath, file.path)), 'file path should be relative');
          });

          done();
        }));
    });
  });

  describe('when comparing by file modification time: ', function () {
    it('passes all files on start by default', function (done) {
      gulp.src('fixture/*')
        .pipe(changedInPlace({
          firstPass: true,
          cache: {},
          howToDetermineDifference: 'modification-time'
        }))
        .pipe(concatStream(function (buf) {
          assert.equal(2, buf.length);
          assert.equal('a', path.basename(buf[0].path));
          assert.equal('b', path.basename(buf[1].path));
          done();
        }));
    });

    it('does not pass all files on start with `firstPass: false`', function (done) {
      gulp.src('fixture/*')
        .pipe(changedInPlace({
          firstPass: false,
          cache: {},
          howToDetermineDifference: 'modification-time'
        }))
        .pipe(concatStream(function (buf) {
          assert.equal(0, buf.length);
          done();
        }));
    });

    it('should only pass through files when their modification time changed', function (done) {
      var times = {};

      var fileA = path.join(__dirname, 'fixture/a');
      var fileB = path.join(__dirname, 'fixture/b');

      var timeNow = Date.now() / 1000;  // https://nodejs.org/docs/latest/api/fs.html#fs_fs_utimes_path_atime_mtime_callback

      var timeThen = new Date();
      timeThen.setFullYear(timeThen.getFullYear() - 1);

      var fileBTime = fs.statSync(fileB).mtime;
      fs.utimesSync(fileA, timeNow, timeNow);

      times[fileA] = timeThen;
      times[fileB] = fileBTime.getTime();

      gulp.src('fixture/*')
        .pipe(changedInPlace({
          firstPass: false,
          cache: times,
          howToDetermineDifference: 'modification-time'
        }))
        .pipe(concatStream(function (buf) {
          assert.equal(1, buf.length);
          assert.equal('a', path.basename(buf[0].path));
          done();
        }));
    });

    it('should update cache before pushing file to stream', function (done) {
      var times = {};

      gulp.src('fixture/*')
        .pipe(changedInPlace({
          firstPass: true,
          cache: times,
          howToDetermineDifference: 'modification-time'
        }))
        .pipe(es.map(function (file, callback) {
          // imitate gulp.dest without actualy writing files
          // @see https://github.com/gulpjs/vinyl-fs/blob/master/lib/prepareWrite.js#L24
          var targetBase = path.resolve(file.cwd, './build');
          var targetPath = path.resolve(targetBase, file.relative);
          file.base = targetBase;
          file.path = targetPath;
          callback(null, file);
        }))
        .pipe(concatStream(function (files) {
          assert.equal(2, files.length, 'should be 2 files');

          files.map(function (file) {
            assert.equal(undefined, times[file.path], 'path of changed file should not be in cache');
          });

          done();
        }));
    });

    it('should use paths relative to `basePath`', function (done) {
      var times = {};
      var basePath = __dirname;

      gulp.src('fixture/*')
        .pipe(changedInPlace({
          firstPass: true,
          basePath: basePath,
          cache: times,
          howToDetermineDifference: 'modification-time'
        }))
        .pipe(concatStream(function (files) {

          files.map(function (file) {
            assert.equal(true, times.hasOwnProperty(path.relative(basePath, file.path)), 'file path should be relative');
          });

          done();
        }));
    });
  });
});
