const weaviate = require('weaviate-client');
const {traverse, parse} = require('./util.js');

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

    traverse($ => {
      const {title, contents} = parse($);
      
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