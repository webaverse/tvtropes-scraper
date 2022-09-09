const {getUrlPath} = require('./util.js');

const u = process.argv[3] ?? '';
u && console.log(getUrlPath(u));