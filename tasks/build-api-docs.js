const { ApiConsoleProject } = require('@api-components/api-console-builder');
const path = require('path');

const destination = path.join(__dirname, '..', 'ci-app', 'api-docs');
const api = path.join(__dirname, '..', 'api-model', 'apic-api.raml');

(async () => {
  const project = new ApiConsoleProject({
    destination,
    api,
    apiType: 'RAML 1.0',
    apiMediaType: 'application/raml',
    tagName: '6.0.0-preview.36',
    verbose: true,
  });
  try {
    await project.bundle();
  } catch (e) {
    /* eslint-disable-next-line no-console */
    console.error(e);
    process.exit(e);
  }
})();
// api-console build -t 'RAML 1.0' -a api-model/apic-api.raml -o ci-app/api-docs
