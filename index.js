const path = require('path');
const fs = require('fs');
const {URL} = require('url');
const murmur = require('murmurhash-js');
const cheerio = require('cheerio');
const fetch = require('cross-fetch');
const mkdirp = require('mkdirp');

const u = new URL(`https://tvtropes.org/pmwiki/pmwiki.php/Main/Settings`);
const dataDirectory = `data`;

const _getKey = s => murmur.murmur3(s);

const pageCache = {
  get(u) {
    const key = _getKey(u);
    try {
      return fs.readFileSync(path.join(dataDirectory, `${key}.html`), 'utf8');
    } catch (err) {
      if (err.code === 'ENOENT') {
        return null;
      } else {
        throw err;
      }
    }
  },
  set(u, d) {
    const key = _getKey(u);
    fs.writeFileSync(path.join(dataDirectory, `${key}.html`), d);
  },
};
const seenSet = new Set();

const _wait = (t = 0) => new Promise(accept => {
  setTimeout(() => {
    accept();
  }, t);
});

mkdirp.sync(dataDirectory);
(async () => {
  const _recurse = async (u, depth = 0) => {
    u += '';

    if (!seenSet.has(u)) {
      seenSet.add(u);

      const text = await (async () => {
        let cachedText = pageCache.get(u);
        if (cachedText !== null) {
          return cachedText;
        } else {
          console.log(u);
          const _fetchText = async () => {
            if (depth > 0) {
              await _wait(100);
            }
            const res = await fetch(u);
            if (res.ok || res.status === 404) {
              const text = await res.text();
              pageCache.set(u, text);
              return text;
            } else {
              console.log('delaying request due to error:', res.status, res.statusText);
              await _wait(60 * 1000);
              console.log('trying again');
              return await _fetchText();
            };
          };
          return await _fetchText();
        }
      })();

      const $ = cheerio.load(text);

      /* const shouldContinue = (() => {
        if (depth < 2) {
          const h2 = $(`#main-article > h2`);
          const h2InnerTexts = Array.from(h2).map(el => el.innerText ?? '');
          return !h2InnerTexts.some(h2InnerText => /example/i.test(h2InnerText));
        } else {
          return false;
        }
      })(); */
      const shouldContinue = depth < 6;
      const urls = Array.from($('#main-article ul > li > a')).map(el => {
        return el.attribs.href;
      }).filter(u2 => !!u2)
        .map(u2 => {
          try {
            return new URL(u2, u);
          } catch(err) {
            return new URL('https://example.com/');
          }
        })
        .filter(u2 => u2.origin === `https://tvtropes.org` && /^\/pmwiki\/pmwiki\.php/i.test(u2.pathname));

      // get contents
      {
        // $(`#main-article hr ~ *`).remove();
        // $('.square_ad').remove();

        // const title = $('h1').first().text().trim();
        // const contents = $('#main-article').text().trim();
        
        // console.log({
        //   title,
        //   contents,
        // });
      }

      if (shouldContinue) {
        for (const u2 of urls) {
          await _recurse(u2, depth + 1);
        }
      }
    }
  };
  await _recurse(u);
})();