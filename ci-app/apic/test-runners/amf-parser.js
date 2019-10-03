const path = require('path');
const logging = require('../../lib/logging');

const args = process.argv;
let workingDir;
for (let i = 0, len = args.length; i < len; i++) {
  if (args[i] === '--working-dir') {
    workingDir = args[i + 1];
    break;
  }
}
const url = path.join(workingDir, 'amf', 'lib', 'amf.js');
const amf = require(url);
amf.plugins.document.WebApi.register();
amf.plugins.document.Vocabularies.register();
amf.plugins.features.AMFValidation.register();

process.on('message', (data) => {
  const generator = amf.Core.generator('AMF Graph', 'application/ld+json');
  amf.Core.init()
    .then(() => {
      if (data.source.indexOf('http') !== 0) {
        data.source = `file://${data.source}`;
      }
      logging.verbose(
        'Parsing AMF file: ' + data.source + ', with type: ' + data.type + ', with media type: ' + data.mediaType
      );
      const parser = amf.Core.parser(data.type, data.mediaType);
      return parser.parseFileAsync(data.source);
    })
    .then((doc) => {
      logging.verbose('API parsed. Resolving model...');
      const resolver = amf.Core.resolver(data.type);
      doc = resolver.resolve(doc, 'editing');
      logging.verbose('Model resolved. Generating model.');
      return generator.generateString(doc);
    })
    .then((result) => {
      logging.verbose('API model ready. Sending back to parent app..');
      process.send({
        api: result,
        source: data.source
      });
    })
    .catch((cause) => {
      let m = `AMF parser: Unable to parse the API.\n`;
      m += cause.message || cause.toString();
      logging.error(m);
      process.send({ error: m });
    });
});
