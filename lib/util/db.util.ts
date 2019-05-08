import * as path from 'path';
import * as Datastore from 'nestdb';

interface GetCollectionOptions {
  name: string;
  persistent: boolean;
}

interface DatastoreList {
  [key: string]: Datastore;
}

export class DbUtil {
  private  datastores: DatastoreList = {};

  constructor() {}

  async getCollection(options: GetCollectionOptions): Promise<Datastore> {
    const ds = this.datastores[options.name];
    if (ds !== undefined) {
      return Promise.resolve(ds);
    } else {
      let collection: Promise<Datastore>;
      if (options.persistent) {
        console.log('persistent');
        collection = this.loadCollection(options.name)
      } else {
        console.log('in-memory')
        collection = this.memoryCollection();
      }
      const datastore = await collection;
      this.datastores[options.name] = datastore;
      return this.datastores[options.name];
    }
  }

  loadCollection(filename: string): Promise<Datastore> {
    const filePath = path.join(__dirname, '../../data', (filename + '.db'));
    console.log(filePath);
    const ds = new Datastore({filename: filePath});
    return new Promise((resolve, reject) => {
      ds.load((err: any) => {
        if (err) {
          /* istanbul ignore next */
          reject(new Error(err));
        } else {
          resolve(ds);
        }
      });
    });
  }

  memoryCollection(): Promise<Datastore> {
    return Promise.resolve(new Datastore());
  }
}
