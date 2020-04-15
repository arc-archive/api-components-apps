const path = require('path');
const fs = require('fs-extra');
/* eslint-disable no-console */
const args = process.argv;
let workingDir;
for (let i = 0, len = args.length; i < len; i++) {
  if (args[i] === '--working-dir') {
    workingDir = args[i + 1];
    break;
  }
}
const url = path.join(workingDir, 'lib', 'amf.js');
console.log(`Using AMF libray located in ${url}`);
const amf = require(url);
amf.plugins.document.WebApi.register();
amf.plugins.document.Vocabularies.register();
amf.plugins.features.AMFValidation.register();
/**
 * Stores both models in correesponding files.
 * @param {String} model Regular model
 * @param {String} compact Compact model
 * @param {String} destBase File path base (without extension)
 * @return {Promise}
 */
async function storeModels(model, compact, destBase) {
  const regularFile = `${destBase}.json`;
  const compactFile = `${destBase}-compact.json`;
  console.log(`Storing ${regularFile}...`);
  await fs.writeFile(regularFile, model);
  console.log(`Storing ${compactFile}...`);
  await fs.writeFile(compactFile, compact);
  // Code below makes a copy of the regular file for debug purposes
  // DON'T LEAVE IT IN PROD
  // const parts = destBase.split('/');
  // const apiFile = `${parts.pop()}.json`; // file name
  // parts.pop(); // demo/ or test/ dir
  // const dir = parts.pop(); // component name
  // const modelLoc = path.join('/', 'tmp', 'amf-tests', dir);
  // fs.ensureDirSync(modelLoc);
  // const testPath = path.join(modelLoc, apiFile);
  // fs.outputFileSync(testPath, model);
}
/**
 * Generates regular and compact model for the API.
 * @param {Object} doc Parsed API document
 * @param {String} type API type.
 * @param {String} [resolution='editing'] API Console's resolution pipeline
 * @return {Promise<Array>} A promise resolved to an array containing (in order)
 * regular and compact nodel as tring.
 */
async function generateModels(doc, type, resolution='editing') {
  const result = [];
  const generator = amf.Core.generator('AMF Graph', 'application/ld+json');
  let resolver;
  switch (type) {
    case 'RAML 1.0': resolver = amf.Core.resolver('RAML 1.0'); break;
    case 'RAML 0.8': resolver = amf.Core.resolver('RAML 0.8'); break;
    case 'OAS 2.0': resolver = amf.Core.resolver('OAS 2.0'); break;
    case 'OAS 3.0': resolver = amf.Core.resolver('OAS 3.0'); break;
  }
  if (resolver) {
    doc = resolver.resolve(doc, resolution);
  }
  const optsRegular = amf.render.RenderOptions().withSourceMaps;
  result[result.length] = await generator.generateString(doc, optsRegular);
  const optsCompact = amf.render.RenderOptions().withSourceMaps.withCompactUris;
  result[result.length] = await generator.generateString(doc, optsCompact);
  return result;
}

/**
 * Normalizes input options to a common structure.
 * @param {String|Array|Object} input User input
 * @return {Object} A resulting configuration options with:
 * - required `type`
 * - optional `mime`
 * - optional `resolution`
 */
function normalizeOptions(input) {
  if (Array.isArray(input)) {
    const [type, mime, resolution] = input;
    return { type, mime, resolution };
  }
  if (typeof input === 'object') {
    return input;
  }
  return {
    type: input,
  };
}

/**
 * Parses file and sends it to process.
 *
 * @param {String} file File name in `demo` folder
 * @param {String} type Source API type.
 * @param {String} mime API spec media type.
 * @return {String}
 */
async function parseFile(file, type, mime='application/raml') {
  console.log(
      `Parsing ${file} with type ${type} and media type ${mime}`
  );
  const parser = amf.Core.parser(type, mime);
  return await parser.parseFileAsync(`file://${file}`);
}

async function runFile(data) {
  const { source, destBase } = data;
  const { type, mime='application/yaml', resolution='editing' } = normalizeOptions(data);
  await amf.Core.init();
  const doc = await parseFile(source, type, mime);
  console.log('API parsed. Generating model...');
  const [model, compact] = await generateModels(doc, type, resolution);
  await storeModels(model, compact, destBase);
}

process.on('message', async (data) => {
  try {
    await runFile(data);
    console.log('API models ready.');
    process.send({
      error: false
    });
  } catch (e) {
    let m = `AMF parser: Unable to parse the API.\n`;
    m += e.message || e.toString();
    console.error(m);
    process.send({ error: m });
  }
});
