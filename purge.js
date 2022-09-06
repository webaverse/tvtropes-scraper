const path = require('path');
const fs = require('fs');
// const {URL} = require('url');
const murmur = require('murmurhash-js');
const cheerio = require('cheerio');
// const fetch = require('cross-fetch');
// const mkdirp = require('mkdirp');

const {parse} = require('./util.js');

for (const dataDir of [
  'data',
  'data2',
  'data3',
  'data4',
  'data5',
  'data6',
]) {
  const dataFiles = fs.readdirSync(dataDir);
  console.log(`${dataDir} (${dataFiles.length})`);
  for (const f of dataFiles) {
    try {
      const p = path.join(dataDir, f);
      let result = fs.readFileSync(p, 'utf8');
      if (result) {
        // check that it's not a 403 page
        const $ = cheerio.load(result);
        const {title} = parse($);
        if (title === '403') {
          console.log('unlink 403 cache', p);
          fs.unlinkSync(p);
          // result = null;
        }
      }
      // return result;
    } catch (err) {
      if (err.code === 'ENOENT') {
        // return null;
      } else {
        throw err;
      }
    }
  }
}