const path = require('path');
const fs = require('fs');
// const {URL} = require('url');
const {traverse, parse, getUrls, getPageName, isTropePageName} = require('./util.js');

const mkdirp = require('mkdirp');

//

const formattedDataDirectory = 'formatted-data';

//

const _makePageCache = () => ({
  map: new Map(),
  add(name, trope) {
    this.map.set(name, trope);
  },
  toJSON() {
    return Object.fromEntries(this.map);
  },
});
const tropesCache = _makePageCache();
const examplesCache = _makePageCache();
const childrenCache = {
  map: new Map(),
  add(parentName, childName) {
    let children = this.map.get(parentName);
    if (children === undefined) {
      children = [];
      this.map.set(parentName, children);
    }
    children.push(childName);
  },
  toJSON() {
    return Object.fromEntries(this.map);
  },
};

//


mkdirp.sync(formattedDataDirectory);

let i = 0;
const _log = () => {
  console.log(JSON.stringify(tropesCache, null, 2));
  console.log(JSON.stringify(examplesCache, null, 2));
  console.log(JSON.stringify(childrenCache, null, 2));
};
const logRate = 100;
const _tryLog = () => {
  if ((++i) % logRate === 0) {
    _log();
  }
};
traverse((url, $) => {
  console.log(url);

  const hasChildren = (() => {
    const h2 = $(`#main-article > h2`);
    const h2InnerTexts = Array.from(h2).map(el => el.innerText ?? '');
    return !h2InnerTexts.some(h2InnerText => /example/i.test(h2InnerText));
  })();
  const page = parse($);
  const name = getPageName(url);
  const isTrope = isTropePageName(name);
  if (isTrope) {
    const tropeName = name;
    tropesCache.add(tropeName, page);
  } else {
    const exampleName = name;
    examplesCache.add(exampleName, page);
  }
  if (hasChildren) {
    const parentName = name;
    const childUrls = getUrls($);
    for (const childUrl of childUrls) {
      const childName = getPageName(childUrl);
      childrenCache.add(parentName, childName);
    }
  }
  
  // console.log(page);

  // _tryLog();
}, {
  download: false,
});
// write formatted data
fs.writeFileSync(path.join(formattedDataDirectory, 'tropes.json'), JSON.stringify(tropesCache), 'utf8');
fs.writeFileSync(path.join(formattedDataDirectory, 'examples.json'), JSON.stringify(examplesCache), 'utf8');
fs.writeFileSync(path.join(formattedDataDirectory, 'children.json'), JSON.stringify(childrenCache), 'utf8');