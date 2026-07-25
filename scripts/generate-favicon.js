const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const { imagesToIco } = require("png-to-ico");

const svgPath = path.join(__dirname, "..", "app", "icon.svg");
const outPath = path.join(__dirname, "..", "app", "favicon.ico");

async function main() {
  const svg = fs.readFileSync(svgPath);
  const sizes = [16, 32, 48];
  const rawImages = await Promise.all(
    sizes.map(async (size) => {
      const { data, info } = await sharp(svg, { density: 384 })
        .resize(size, size)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      return { width: info.width, height: info.height, data };
    })
  );
  const ico = await imagesToIco(rawImages);
  fs.writeFileSync(outPath, ico);
  console.log("Wrote", outPath);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
