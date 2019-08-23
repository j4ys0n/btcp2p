import chai = require('chai');
const expect = chai.expect;
const should = chai.should();
import * as fs from 'fs';
import * as path from 'path';

import { DbUtil } from '../lib/util/db.util';

describe('NestDB tests', () => {

  const dbUtil = new DbUtil();

  it('should return a new in-memory Datastore', (done) => {
    dbUtil.getCollection({name: 'test', persistent: false})
    .then((ds) => {
      done();
    })
  })

  it('should return a new persistent Datastore and check that the db file exists', (done) => {
    dbUtil.getCollection({name: 'test2', persistent: true})
    .then((ds) => {
      const filePath = path.join(__dirname, '../data', ('test2' + '.db'));
      try {
        if (fs.existsSync(filePath)) {
          done();
        } else {
          done(new Error(filePath + ' does not exist'));
        }
      } catch (e) {
        done(new Error(filePath + ' does not exist'));
      }

    })
  })

  it('should return an existing Datastore', (done) => {
    dbUtil.getCollection({name: 'test', persistent: false})
    .then((ds) => {
      done();
    })
  })
})
