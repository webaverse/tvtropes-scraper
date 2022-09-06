const {getUrlPath} = require('./util.js');

const u = process.argv[2] ?? '';
u && console.log(getUrlPath(u));