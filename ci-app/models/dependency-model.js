import { BaseModel } from './base-model';
/**
 * A model for catalog items.
 */
export class DependencyModel extends BaseModel {
  /**
   * @constructor
   */
  constructor() {
    super('api-components');
  }

  _createKey(name) {
    return this.store.key({
      namespace: this.namespace,
      path: [this.dependencyKind, this.slug(name)]
    });
  }

  get excludeFromIndexes() {
    return ['pkg', 'org'];
  }

  set(component, dependencies, devDependencies, org, pkg) {
    const key = this._createKey(component);
    const results = [
      {
        name: 'pkg',
        value: pkg,
        excludeFromIndexes: true
      },
      {
        name: 'org',
        value: org,
        excludeFromIndexes: true
      }
    ];
    if (dependencies) {
      results[results.length] = {
        name: 'dependencies',
        value: dependencies
      };
    }
    if (devDependencies) {
      results[results.length] = {
        name: 'devDependencies',
        value: devDependencies
      };
    }
    const entity = {
      key,
      data: results
    };
    return this.store.upsert(entity);
  }

  async listParentComponents(dependency, includeDev) {
    let query = this.store.createQuery(this.namespace, this.dependencyKind);
    query = query.filter('dependencies', '=', dependency);
    let deps = [];
    const [items] = await this.store.runQuery(query);
    if (items) {
      deps = items.map((item) => {
        return {
          production: true,
          name: item.pkg
        };
      });
    }
    if (includeDev) {
      const other = await this.listDevParentComponents(dependency);
      if (other) {
        deps = deps.concat(other);
      }
    }
    return deps;
  }

  async listDevParentComponents(dependency) {
    let query = this.store.createQuery(this.namespace, this.dependencyKind);
    query = query.filter('devDependencies', '=', dependency);
    const [items] = await this.store.runQuery(query);
    if (!items) {
      return;
    }
    return items.map((item) => {
      return {
        development: true,
        name: item.pkg
      };
    });
  }

  get(component) {
    const key = this._createKey(component);
    return this.store.get(key).then((entity) => {
      if (entity && entity[0]) {
        return this.fromDatastore(entity[0]);
      }
    });
  }

  // async updatePackages() {
  //   let query = this.store.createQuery(this.namespace, this.dependencyKind);
  //   const [items] = await this.store.runQuery(query);
  //   const updates = [];
  //   for (let i = 0; i < items.length; i++) {
  //     const item = items[i];
  //     if (item.org) {
  //       continue;
  //     }
  //     const key = item[this.store.KEY];
  //     const { name } = key;
  //     let scope;
  //     if (name.indexOf('amf-') === 0 || name.indexOf('api-') === 0) {
  //       scope = 'api-components';
  //     } else {
  //       scope = 'advanced-rest-client';
  //     }
  //     item.pkg = `@${scope}/${name}`;
  //     item.org = `advanced-rest-client`;
  //     updates[updates.length] = {
  //       key,
  //       data: item,
  //       excludeFromIndexes: this.excludeFromIndexes
  //     };
  //     if (updates.length === 20) {
  //       break;
  //     }
  //   }
  //   if (!updates.length) {
  //     return;
  //   }
  //   // console.log(updates);
  //   const transaction = this.store.transaction();
  //   await transaction.run();
  //   transaction.save(updates);
  //   await transaction.commit();
  // }
}
