const os = require('os');
const fs = require('fs-extra');
const path = require('path');
const util = require('util');
const { spawnSync } = require('child_process');
const npm2arch = require('./npm2PKGBUILD');

module.exports = (npmName, makePkgArgv, options) => {
  const aurball = makePkgArgv === 'aurball';
  if (aurball) {
    makePkgArgv = [];
  }
  if (!makePkgArgv) {
    makePkgArgv = [];
  }
  if (!options) {
    options = { verbose: true };
  }
  const { verbose } = options;
  // Create a tmp directory to work on
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'npm2archinstall-'));

  // Create a package for archlinux with makepkg cmd
  const promise = npm2arch(npmName, options)
    .then(pkgbuild =>
      // Write the PKGBUILD file in the tmpDir
      fs.writeFile(path.join(tmpDir, 'PKGBUILD'), pkgbuild)
    )
    .then(() => {
      // Spawn makepkg/mkaurball
      const stdio = verbose ? 'inherit' : 'ignore';
      const opts = { cwd: tmpDir, env: process.env, setsid: false, stdio };
      const cmd = aurball ? 'mkaurball' : 'makepkg';
      const child = spawnSync(cmd, makePkgArgv, opts);
      if (child.status !== 0) {
        throw new Error(
          `Bad status code returned from \`${makepkg}\`: ${child.status}`
        );
      }
    })
    .then(() =>
      // Get the package file name
      fs.readdir(tmpDir)
    )
    .then(files => {
      const pkgFile = files.filter(file => file.indexOf('nodejs-') === 0)[0];
      const newPkgFile = path.join(process.cwd(), path.basename(pkgFile));
      if (fs.existsSync(newPkgFile)) {
        fs.unlinkSync(newPkgFile);
      }
      fs.moveSync(path.join(tmpDir, pkgFile), newPkgFile);
      return newPkgFile;
    });
  promise.then(() => fs.remove(tmpDir)).catch(() => fs.remove(tmpDir));
  return promise;
};
