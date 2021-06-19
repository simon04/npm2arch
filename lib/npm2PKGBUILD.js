const fetchJSON = require('./fetchJSON');

// transform pkg.json of `npmName` into a PKGBUILD and returns a Promise
module.exports = (npmName, options) => {
  if (typeof options === 'function') {
    options = null;
  }
  if (!options) {
    options = {};
  }
  const url = `https://registry.npmjs.org/${npmName}/latest`;
  return fetchJSON(url)
    .then(pkg => {
      pkg.nameLowerCase = pkg.name.toLowerCase();
      if (!pkg.homepage) {
        pkg.homepage = pkg.url;
      }
      if (pkg.repository != null ? pkg.repository.url : undefined) {
        if (!pkg.homepage) {
          pkg.homepage = pkg.repository.url
            .replace(/^git(@|:\/\/)/, 'https://')
            .replace(/\.git$/, '')
            .replace(/(\.\w*)\:/g, '$1/');
        }
      }
      pkg.depends = (options.depends || []).map(d => ` '${d}'`).join('');
      pkg.optdepends = (options.optdepends || [])
        .map(o => {
          const key = Object.keys(o)[0];
          const value = o[key];
          return `${key}: ${value}`;
        })
        .map(d => `'${d}'`)
        .join(' ');
      pkg.archVersion = pkg.version.replace(/-/, '_');
      pkg.license = pkg.license || (pkg.licenses || []).map(l => l.type);
      return pkg;
    })
    .then(
      pkg => `_npmname=${pkg.name}
_npmver=${pkg.version}
pkgname=nodejs-${pkg.nameLowerCase} # All lowercase
pkgver=${pkg.archVersion}
pkgrel=1
pkgdesc="${pkg.description}"
arch=(any)
url="${pkg.homepage}"
license=(${pkg.license})
depends=('nodejs' 'npm'${pkg.depends})
optdepends=(${pkg.optdepends})
source=(https://registry.npmjs.org/$_npmname/-/$_npmname-$_npmver.tgz)
noextract=($_npmname-$_npmver.tgz)
sha1sums=(${pkg.dist.shasum})

package() {
  cd $srcdir
  local _npmdir="$pkgdir/usr/lib/node_modules/"
  mkdir -p $_npmdir
  cd $_npmdir
  npm install -g --prefix "$pkgdir/usr" $_npmname@$_npmver
  chown -R root:root "${pkgdir}"
}

# vim:set ts=2 sw=2 et:`
    )
    .catch(err => {
      throw new Error(`Registry returned ${err} for GET on ${url}`);
    });
};
