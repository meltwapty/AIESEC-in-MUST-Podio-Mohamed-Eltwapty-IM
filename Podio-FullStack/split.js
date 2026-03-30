const fs = require('fs');
const html = fs.readFileSync('..\\\\AIESEC in MUST Podio Final.html', 'utf-8');

const cssStart = html.indexOf('<style>') + 7;
const cssEnd = html.indexOf('</style>');
const css = html.substring(cssStart, cssEnd);
fs.writeFileSync('public/styles.css', css.trim(), 'utf-8');

const jsStart = html.indexOf('<script>') + 8;
const jsEnd = html.lastIndexOf('</script>'); // in case there are multiple script tags
const js = html.substring(jsStart, jsEnd);
fs.writeFileSync('public/app.js', js.trim(), 'utf-8');

// replace style block with link tag
let newHtml = html.replace(/<style>[\s\S]*?<\/style>/i, '<link rel="stylesheet" href="styles.css">');
// replace script block with script src
newHtml = newHtml.replace(/<script>[\s\S]*?<\/script>/i, '<script src="app.js"></script>');

fs.writeFileSync('public/index.html', newHtml, 'utf-8');
console.log('Split complete!');
