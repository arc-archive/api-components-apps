const path = require('path');
const logging = require('../lib/logging');

process.on('message', (data) => {
  logging.verbose('AMF parser process received data');
  const url = path.join(data.workingDir, 'amf', 'lib', 'amf.js');
  logging.verbose('Using AMF parser located in ' + url);
  const amf = require(url);
  const generator = amf.Core.generator('AMF Graph', 'application/ld+json');
  amf.plugins.document.WebApi.register();
  amf.plugins.document.Vocabularies.register();
  amf.plugins.features.AMFValidation.register();

  amf.Core.init()
  .then(() => {
    if (data.source.indexOf('http') !== 0) {
      data.source = `file://${data.source}`;
    }
    logging.verbose('Parsing AMF file: ', data.source);
    let contentType;
    switch (data.type) {
      case 'RAML 1.0':
      case 'RAML 0.8':
        contentType = 'application/raml';
        break;
      case 'OAS 2.0':
      case 'OAS 3.0':
        contentType = data.mediaType || 'application/json';
        break;
    }
    const parser = amf.Core.parser(data.type, contentType);
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
    process.send({error: m});
  });
});
