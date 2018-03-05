const { npm2PKGBUILD, createPkg } = require('../index');
const mocha = require('mocha');
const vows = require('vows');
const assert = require('assert');
const path = require('path');
const fs = require('fs-extra');
const hasbin = require('hasbin');

const cwd = process.cwd();

describe('Test npm2arch', function() {
  it('should create a PKGBUILD when calling npm2PKGBUILD with an existing package in npm', () =>
    npm2PKGBUILD('npm2arch', {
      depends: ['curl', 'git'],
      optdepends: [{ phantomjs: 'browser-run test suite' }]
    }).then(pkgbuild => {
      assert.isNotNull(pkgbuild);
      assert.include(pkgbuild, 'license=(MIT)');
      assert.include(pkgbuild, 'url="https://github.com/Filirom1/npm2arch"');
      assert.include(
        pkgbuild,
        'pkgdesc="Convert NPM package to a PKGBUILD for ArchLinux"'
      );
      assert.include(pkgbuild, "depends=('nodejs' 'npm' 'curl' 'git' )");
      assert.include(
        pkgbuild,
        "optdepends=('phantomjs: browser-run test suite' )"
      );
    }));

  it('should put in lower case package name in UPPER CASE', () =>
    npm2PKGBUILD('CM1').then(pkgbuild => {
      assert.isNotNull(pkgbuild);
      assert.include(pkgbuild, 'pkgname=nodejs-cm1');
    }));

  it('should return an error when calling npm2PKGBUILD with a non existing package in npm', () =>
    npm2PKGBUILD('fqkjsdfkqjs').catch(err => {
      assert.isNotNull(err);
      assert.equal(
        'Registry returned 404 for GET on https://registry.npmjs.org/fqkjsdfkqjs',
        err.message
      );
    }));

  it('should create a package when calling createPkg with a real package name', function() {
    if (!hasbin.sync('makepkg')) {
      this.skip('mssing makepkg dependency');
    }
    const randomId = (((1 + Math.random()) * 0x10000) | 0)
      .toString(16)
      .substring(1);
    const dir = `/tmp/test-npm2arch-${randomId}-dir/`;
    fs.mkdirSync(dir);
    process.chdir(dir);
    return createPkg('npm2arch', ['--source'], { verbose: false }, function(
      err,
      file
    ) {
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

  it('should create an AUR tarball when calling createPkg with a real package name', function() {
    if (!hasbin.sync('mkaurball')) {
      this.skip('missing mkaurball dependency');
    }
    const randomId = (((1 + Math.random()) * 0x10000) | 0)
      .toString(16)
      .substring(1);
    const dir = `/tmp/test-npm2arch-${randomId}-dir/`;
    fs.mkdirSync(dir);
    process.chdir(dir);
    return createPkg('npm2arch', 'aurball', { verbose: false }).then(file => {
      assert.include(file, '/tmp/');
      assert.include(file, '-dir/');
      assert.include(file, 'nodejs-npm2arch-');
      assert.include(file, '.src.tar.gz');
      assert.isTrue(fs.existsSync(file));
      fs.removeSync(path.dirname(file));
    });
  });

  return it('should return an error when calling createPkg with a bad package name', () =>
    createPkg('qsdfqsdfqsd', ['--source'], { verbose: false }).catch(err => {
      assert.isNotNull(err);
      assert.equal(
        'Registry returned 404 for GET on https://registry.npmjs.org/qsdfqsdfqsd',
        err.message
      );
    }));
});
