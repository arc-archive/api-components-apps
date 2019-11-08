/**
 * Extracts scope and name of a package from package's name.
 * Scope has no `@` character!
 *
 * @param {String} fullName Full name from the package.json file.
 * @return {Array<String>} The first item is package scope and the second is the name.
 * Note, scope can be `null`.
 */
export const getScopeAndName = (fullName) => {
  let [scope, name] = fullName.split('/');
  if (!name) {
    name = scope;
    scope = null;
  }
  if (scope && scope[0] === '@') {
    scope = scope.substr(1);
  }
  return [scope, name];
};
