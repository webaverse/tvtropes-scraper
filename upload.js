const weaviate = require('weaviate-client');
const mkdirp = require('mkdirp');
const {traverse, parse, getUrls, getPageName} = require('./util.js');

//

/* const _makePageCache = () => ({
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
}; */

//

const client = weaviate.client({
  scheme: 'http',
  host: 'weaviate.webaverse.com:8080',
});
client
  .schema
  .getter()
  .do()
  .then(res => {
    console.log(res);

    // load formatted data
  })
  .catch(err => {
    console.error(err)
  });