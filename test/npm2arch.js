/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const {npm2PKGBUILD, createPkg} = require('../index');
const mocha  = require('mocha');
const vows   = require('vows');
const assert = require('assert');
const path   = require('path');
const fs     = require('fs-extra');
const hasbin = require('hasbin');

const cwd = process.cwd();

describe('Test npm2arch', function() {

  it('should create a PKGBUILD when calling npm2PKGBUILD with an existing package in npm', done =>
      npm2PKGBUILD('npm2arch', {depends: ['curl', 'git'], optdepends: [ {phantomjs: 'browser-run test suite'}]}, function(err, pkgbuild) {
        assert.isNull(err);
        assert.isNotNull(pkgbuild);
        assert.include(pkgbuild, "license=(MIT)");
        assert.include(pkgbuild, 'url="https://github.com/Filirom1/npm2arch"');
        assert.include(pkgbuild, 'pkgdesc="Convert NPM package to a PKGBUILD for ArchLinux"');
        assert.include(pkgbuild, "depends=('nodejs' 'npm' 'curl' 'git' )");
        assert.include(pkgbuild, "optdepends=('phantomjs: browser-run test suite' )");
        return done();
      })
  );

  it('should put in lower case package name in UPPER CASE', done=>
      npm2PKGBUILD('CM1', function(err, pkgbuild) {
        assert.isNull(err);
        assert.isNotNull(pkgbuild);
        assert.include(pkgbuild, "pkgname=nodejs-cm1");
        return done();
      })
  );

  it('should return an error when calling npm2PKGBUILD with a non existing package in npm', done=>
      npm2PKGBUILD('fqkjsdfkqjs',  function(err, pkgbuild) {
        assert.isNotNull(err);
        assert.equal('Registry returned 404 for GET on https://registry.npmjs.org/fqkjsdfkqjs', err.message);
        return done();
      })
  );

  it('should create a package when calling createPkg with a real package name', function(done){
      if (!hasbin.sync('makepkg')) { this.skip('mssing makepkg dependency'); }
      const randomId =  (((1+Math.random())*0x10000)|0).toString(16).substring(1);
      const dir = `/tmp/test-npm2arch-${randomId}-dir/`;
      fs.mkdirSync(dir);
      process.chdir(dir);
      return createPkg('npm2arch', ['--source'], {verbose: false}, function(err, file) {
        assert.isNull(err);
        assert.include(file, '/tmp/');
        assert.include(file, '-dir/');
        assert.include(file, 'nodejs-npm2arch-');
        assert.include(file, '.src.tar.gz');
        assert.isTrue(fs.existsSync(file));
        fs.removeSync(path.dirname(file));
        return done();
      });
  });

  it('should create an AUR tarball when calling createPkg with a real package name', function(done){
      if (!hasbin.sync('mkaurball')) { this.skip('missing mkaurball dependency'); }
      const randomId =  (((1+Math.random())*0x10000)|0).toString(16).substring(1);
      const dir = `/tmp/test-npm2arch-${randomId}-dir/`;
      fs.mkdirSync(dir);
      process.chdir(dir);
      return createPkg('npm2arch', 'aurball', {verbose: false}, function(err, file) {
        assert.isNull(err);
        assert.include(file, '/tmp/');
        assert.include(file, '-dir/');
        assert.include(file, 'nodejs-npm2arch-');
        assert.include(file, '.src.tar.gz');
        assert.isTrue(fs.existsSync(file));
        fs.removeSync(path.dirname(file));
        return done();
      });
  });

  return it('should return an error when calling createPkg with a bad package name', done=>
      createPkg('qsdfqsdfqsd', ['--source'], {verbose: false}, function(err, file) {
        assert.isNotNull(err);
        assert.equal('Registry returned 404 for GET on https://registry.npmjs.org/qsdfqsdfqsd', err.message);
        return done();
      })
  );
});
