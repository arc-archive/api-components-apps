import { Analyzer, FsUrlLoader, PackageUrlResolver, generateAnalysis } from 'polymer-analyzer';
import { ComponentModel } from '../models/component-model';
import { Changelog } from './changelog';
import fs from 'fs-extra';
import path from 'path';
/**
 * Class responsible for generating data for API components catalog.
 */
export class CatalogDataGenerator {
  /**
   * @param {String} workingDir Component location.
   * @param {String} org Githug owner organization.
   * @param {String} component Component name from ARC organization.
   * @param {String} tagVersion Released tag version.
   */
  constructor(workingDir, org, component, tagVersion) {
    this.component = component;
    this.organization = org;
    this.version = tagVersion;
    this.workingDir = workingDir;
    this.urlResolver = new PackageUrlResolver({ packageDir: workingDir });
    this.analyzer = new Analyzer({
      urlLoader: new FsUrlLoader(workingDir),
      urlResolver: this.urlResolver
    });
  }
  /**
   * Generates documentation file for the component and tag.
   * Result is sent to the catalog www server.
   *
   * @return {Promise}
   */
  async build() {
    const isInTests = /(\b|\/|\\)(test)(\/|\\)/;
    const isNotTest = (f) => f.sourceRange && !isInTests.test(f.sourceRange.file);
    const isCmp = await this.isComponent();
    if (!isCmp) {
      throw new Error('Not an API component');
    }
    const analysis = await this.analyzer.analyzePackage();
    const tags = this._extractComponentTags(analysis);
    const data = await generateAnalysis(analysis, this.urlResolver, isNotTest);
    const docs = this._cleanStoreData(data);
    const changeLog = await this.getChangelogData();
    const pkg = await this.readPackage();
    const group = this._getGroupName(tags);
    const model = new ComponentModel();
    return await model.addVersion({
      version: this.version,
      component: this.component,
      pkg: pkg.name,
      org: this.organization,
      group,
      docs,
      changeLog,
    });
  }
  /**
   * All API/ARC components have `polymer.json` file describing polymer tools configuration.
   *
   * This function will reject the promise when file does not exist or JSON is
   * invalid.
   * @return {Promise<Boolean>}
   */
  async isComponent() {
    const polymerFile = path.join(this.workingDir, 'polymer.json');
    return await fs.pathExists(polymerFile);
  }

  /**
   * Extracts group name from the analysis result.
   * @param {Object} analysis
   * @return {Array}
   */
  _extractComponentTags(analysis) {
    const set = analysis.getFeatures({ kind: 'element', id: this.component });
    let element;
    set.forEach((item) => {
      element = item;
    });
    let result = [];
    if (element && element.jsdoc && element.jsdoc.tags && element.jsdoc.tags.length) {
      result = element.jsdoc.tags;
    }
    return result;
  }
  /**
   * Extracts group name from the tags.
   *
   * @param {?Array} tags
   * @return {String} Element group name.
   */
  _getGroupName(tags) {
    let result;
    if (tags) {
      const tag = tags.find((item) => item.title === 'memberof' || item.title === 'group');
      if (tag) {
        result = tag.description;
      }
    }
    if (!result) {
      result = 'ApiElements';
    }
    return result;
  }
  /**
   * Removes data not used by the catalog.
   *
   * @param {Object} data Element analysis result.
   * @return {Object} Data ready to be stored.
   */
  _cleanStoreData(data) {
    if (data.elements) {
      data.elements = data.elements.map((item) => this._cleanItem(item));
    }
    if (data.metadata) {
      if (data.metadata.polymer) {
        if (data.metadata.polymer.behaviors) {
          data.metadata.polymer.behaviors = data.metadata.polymer.behaviors.map((item) => this._cleanItem(item));
        }
      }
    }
    return data;
  }
  /**
   * Cleans analysis result item.
   *
   * @param {Object} item Analysis result item
   * @return {Object} Data to be stored in the data store.
   */
  _cleanItem(item) {
    item.events = this.cleanArray(item.events);
    item.methods = this.cleanNames(item.methods);
    item.methods = this.cleanArray(item.methods);
    item.properties = this.cleanNames(item.properties);
    item.properties = this.cleanArray(item.properties);
    item.slots = this.cleanArray(item.slots);
    item.styling = item.styling || {};
    item.styling.cssVariables = this.cleanArray(item.styling.cssVariables);
    item.styling.selectors = this.cleanArray(item.styling.selectors);
    delete item.sourceRange;
    delete item.attributes;
    delete item.staticMethods;
    return item;
  }
  /**
   * Cleans array items for unwanted data from the analysis.
   *
   * @param {Array<Object>} arr Analysed data
   * @return {Array<Object>} Thre same array without unwanted data
   */
  cleanArray(arr) {
    if (!arr || !arr.length) {
      return arr;
    }
    arr = arr.map((item) => {
      delete item.sourceRange;
      return item;
    });
    return arr;
  }
  /**
   * Removes properties and methods from the array that are not directly related
   * to the element.
   *
   * @param {Array<Object>} arr Analysed data
   * @return {Array<Object>} Thre same array without unwanted data
   */
  cleanNames(arr) {
    if (!arr || !arr.length) {
      return arr;
    }
    arr = arr.filter((item) => {
      const inh = item.inheritedFrom;
      if (inh && inh.indexOf('Polymer') !== -1) {
        return false;
      }
      return true;
    });
    return arr;
  }

  async getChangelogData() {
    const changelog = new Changelog(this.workingDir);
    return await changelog.get();
  }

  async readPackage() {
    const pkgFile = path.join(this.workingDir, 'package.json');
    return await fs.readJSON(pkgFile);
  }
}
