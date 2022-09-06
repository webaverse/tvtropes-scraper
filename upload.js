const weaviate = require('weaviate-client');
const {traverse, parse, getUrls} = require('./util.js');

//

const examplesCache = {
  map: new Map(),
  add(tropeUrl, exampleUrl) {
    let examples = this.map.get(tropeUrl);
    if (!examples) {
      examples = [];
      this.map.set(tropeUrl, examples);
    }
    examples.push(exampleUrl);
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

    traverse((url, $) => {
      const isTropePageWithExamples = (() => {
        const h2 = $(`#main-article > h2`);
        const h2InnerTexts = Array.from(h2).map(el => el.innerText ?? '');
        return !h2InnerTexts.some(h2InnerText => /example/i.test(h2InnerText));
      })();
      const {title, contents} = parse($);
      if (isTropePageWithExamples) {
        const tropeUrl = url;
        // console.log('got trope url', tropeUrl, getUrlPath(tropeUrl));
        const exampleUrls = getUrls($);
        for (const exampleUrl of exampleUrls) {
          examplesCache.add(tropeUrl, exampleUrl);
        }
        const o = examplesCache.toJSON();
        console.log(JSON.stringify(o, null, 2));
      }
      
      console.log({
        title,
        contents,
      });
    }, {
      download: false,
    });
  })
  .catch(err => {
    console.error(err)
  });