/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const fs       = require('fs-extra');
const path     = require('path');
const util     = require('util');
const {spawn}  = require('child_process');
const npm2arch = require('./npm2PKGBUILD');


module.exports = function(npmName, makePkgArgv, options, cb) {
  if (typeof makePkgArgv === 'function') {
    cb = makePkgArgv;
    makePkgArgv = null;
    options = null;
  }
  if (typeof options === 'function') {
    cb = options;
    options = null;
  }
  const aurball = makePkgArgv === 'aurball';
  if (aurball) { makePkgArgv = []; }
  if (!makePkgArgv) { makePkgArgv = []; }
  if (!options) { options = {verbose: true}; }
  const { verbose } = options;
  const tmpDir = `/tmp/npm2archinstall-${Date.now()}`;

  // Create a package for archlinux with makepkg cmd
  return npm2arch(npmName, options, function(err, pkgbuild){
    if (err) { return cb(err); }
    // Create a tmp directory to work on
    return fs.mkdir(tmpDir, '0755', function(err){
      if (err) { return cb(err); }
      const cb2 = function() {
        const arg = arguments;
        // Delete the tmp directory
        return fs.remove(tmpDir, function(err) {
          if (err) { return cb(err); }
          return cb.apply(this, arg);
        });
      };

      // Write the PKGBUILD file in the tmpDir
      return fs.writeFile(path.join(tmpDir, "PKGBUILD"), pkgbuild, function(err){
        if (err) { return cb2(err); }
        // Spawn makepkg/mkaurball
        const stdio = verbose ? 'inherit' : 'ignore';
        const opts = {cwd: tmpDir, env: process.env, setsid: false, stdio};
        const child = aurball ?
          spawn('mkaurball', makePkgArgv, opts)
        :
          spawn('makepkg', makePkgArgv, opts);
        return child.on('exit', function(code) {
          const makepkg = aurball ? 'mkaurball' : 'makepkg';
          if (code !== 0) { return cb2(`Bad status code returned from \`${makepkg}\`: ${code}`); }
          // Get the package file name
          return fs.readdir(tmpDir, function(err, files){
            if (err) { return cb2(err); }
            const pkgFile = (files.filter(file=> file.indexOf('nodejs-') === 0))[0];
            const newPkgFile = path.join(process.cwd(), path.basename(pkgFile));
            if (fs.existsSync(newPkgFile)) { fs.unlinkSync(newPkgFile); }
            return fs.move(path.join(tmpDir, pkgFile), newPkgFile, function(err){
              if (err) { return cb2(err); }
              return cb2(null, newPkgFile);
            });
          });
        });
      });
    });
  });
};
