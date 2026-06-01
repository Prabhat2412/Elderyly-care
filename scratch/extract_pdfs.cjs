const fs = require('fs');
const path = require('path');
const { PDFParse } = require('pdf-parse');

const pdfs = [
  'CareZone ApplicationFeatureReview.pdf',
  'Life360_App_ApplicationFeaturesReview.pdf',
  'MedisafeApplicationFeaturesReview.pdf',
  'MyTherapyApplicationFeaturesReview.pdf'
];

async function extractText(filename) {
  const filePath = path.join(__dirname, '..', filename);
  console.log(`Reading ${filePath}...`);
  const dataBuffer = fs.readFileSync(filePath);
  
  try {
    const parser = new PDFParse({ data: dataBuffer });
    const data = await parser.getText();
    const txtPath = path.join(__dirname, `${path.basename(filename, '.pdf')}.txt`);
    fs.writeFileSync(txtPath, data.text);
    console.log(`Successfully extracted to ${txtPath}`);
  } catch (error) {
    console.error(`Error extracting ${filename}:`, error);
  }
}

async function main() {
  for (const file of pdfs) {
    await extractText(file);
  }
}

main();
