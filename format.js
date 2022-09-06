const weaviate = require('weaviate-client');
const {traverse, parse, getUrls, getPageName} = require('./util.js');

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
const linksCache = {
  map: new Map(),
  add(tropeName, exampleName) {
    let examples = this.map.get(tropeName);
    if (!examples) {
      examples = [];
      this.map.set(tropeName, examples);
    }
    examples.push(exampleName);
  },
  toJSON() {
    return Object.fromEntries(this.map);
  },
};

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
    // console.log(res);

    let i = 0;
    const _log = () => {
      console.log(JSON.stringify(tropesCache, null, 2));
      console.log(JSON.stringify(examplesCache, null, 2));
      console.log(JSON.stringify(linksCache, null, 2));
    };
    const logRate = 100;
    const _tryLog = () => {
      if ((++i) % logRate === 0) {
        _log();
      }
    };
    traverse((url, $) => {
      const isTrope = (() => {
        const h2 = $(`#main-article > h2`);
        const h2InnerTexts = Array.from(h2).map(el => el.innerText ?? '');
        return !h2InnerTexts.some(h2InnerText => /example/i.test(h2InnerText));
      })();
      const page = parse($);
      const name = getPageName(url);
      if (isTrope) {
        const tropeName = name;
        tropesCache.add(tropeName, page);

        // console.log('got trope url', tropeUrl, getUrlPath(tropeUrl));
        const exampleUrls = getUrls($);
        for (const exampleUrl of exampleUrls) {
          const exampleName = getPageName(exampleUrl);
          linksCache.add(tropeName, exampleName);
        }
      } else {
        const exampleName = name;
        examplesCache.add(exampleName, page);
      }
      
      // console.log(page);

      // _tryLog();
    }, {
      download: false,
    });
  })
  .catch(err => {
    console.error(err)
  });