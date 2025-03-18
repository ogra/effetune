const fs = require('fs-extra');
const path = require('path');
const png2icons = require('png2icons');

(async () => {
  const source = path.join(__dirname, '../images/icon.png');
  const destDir = path.join(__dirname, '../images/favicon.icns');
  await fs.ensureDir(destDir);
  const input = await fs.readFile(source);
  const output = png2icons.createICNS(input, png2icons.BICUBIC, 0);
  if (output) {
    await fs.writeFile(destDir, output);
    console.log('favicon.icns created.');
  } else {
    throw new Error('ICNS creation failed.');
  }
})();