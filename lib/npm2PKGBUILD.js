#!/usr/bin/env node
/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const npm      = require('npm');
const mustache = require('mustache');
const fs       = require('fs');

// transform pkg.json of `npmName` into a PKGBUILD
// `cb` is called like this: `cb(err, pkgbuild)`
module.exports = function(npmName, options, cb) {

  let populateTemplate;
  if (typeof options === 'function') {
    cb = options;
    options = null;
  }

  if (!options) { options = {}; }

  // Execute npm info `argv[0]`
  npm.load({loglevel:'silent'}, function(er){
    if (er) { return cb(er); }
    return npm.commands.view([npmName], true, function(er, json) {
      if (er) { return cb(er); }
      return parseNPM(json);
    });
  });

  // Parse the info json
  var parseNPM = function(data) {
    const version = Object.keys(data)[0];
    let pkg = data[version];
    pkg = cleanup(pkg);
    pkg.nameLowerCase = pkg.name.toLowerCase();
    if (!pkg.homepage) { pkg.homepage = pkg.url; }
    if (pkg.repository != null ? pkg.repository.url : undefined) { if (!pkg.homepage) { pkg.homepage = pkg.repository.url.replace(/^git(@|:\/\/)/, 'https://').replace(/\.git$/, '').replace(/(\.\w*)\:/g, '$1\/'); } }
    pkg.depends = options.depends;
    pkg.optdepends = options.optdepends != null ? options.optdepends.map(function(o){
      const key = (Object.keys(o))[0];
      const value = o[key];
      return `${key}: ${value}`;
    }) : undefined;
    pkg.archVersion = pkg.version.replace(/-/, '_');
    return populateTemplate(pkg);
  };

  // Populate the template
  return populateTemplate = pkg => cb(null, mustache.to_html(template, pkg));
};

var template = `_npmname={{{name}}}
_npmver={{{version}}}
pkgname=nodejs-{{{nameLowerCase}}} # All lowercase
pkgver={{{archVersion}}}
pkgrel=1
pkgdesc=\"{{{description}}}\"
arch=(any)
url=\"{{{homepage}}}\"
license=({{#licenses}}{{{type}}}{{/licenses}})
depends=('nodejs' 'npm' {{#depends}}'{{{.}}}' {{/depends}})
optdepends=({{#optdepends}}'{{{.}}}' {{/optdepends}})
source=(https://registry.npmjs.org/$_npmname/-/$_npmname-$_npmver.tgz)
noextract=($_npmname-$_npmver.tgz)
sha1sums=({{#dist}}{{{shasum}}}{{/dist}})

package() {
  cd $srcdir
  local _npmdir="$pkgdir/usr/lib/node_modules/"
  mkdir -p $_npmdir
  cd $_npmdir
  npm install -g --prefix "$pkgdir/usr" $_npmname@$_npmver
}

# vim:set ts=2 sw=2 et:`;

// From NPM sources
function cleanup (data) {
  if (Array.isArray(data)) {
    if (data.length === 1) {
      data = data[0];
    } else {
      return data.map(cleanup);
    }
  }
  if (!data || typeof data !== "object") return data;

  if (typeof data.versions === "object"
      && data.versions
      && !Array.isArray(data.versions)) {
    data.versions = Object.keys(data.versions || {});
  }

  let keys = Object.keys(data);
  keys.forEach(function (d) {
    if (d.charAt(0) === "_") delete data[d];
    else if (typeof data[d] === "object") data[d] = cleanup(data[d]);
  });
  keys = Object.keys(data);
  if (keys.length <= 3
      && data.name
      && (keys.length === 1
          || keys.length === 3 && data.email && data.url
          || keys.length === 2 && (data.email || data.url))) {
    data = unparsePerson(data);
  }
  return data;
}
function unparsePerson (d) {
  if (typeof d === "string") return d;
  return d.name
       + (d.email ? ` <${d.email}>` : "")
       + (d.url ? ` (${d.url})` : "");
}
