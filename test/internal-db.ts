import chai = require('chai');
const expect = chai.expect;
const should = chai.should();

import { DbUtil } from '../lib/util/db.util';

describe('NestDB tests', () => {

  const dbUtil = new DbUtil();

  it('should return a new in-memory Datastore', (done) => {
    dbUtil.getCollection({name: 'test', persistent: false})
    .then((ds) => {
      done();
    })
  })

  it('should return a new persistent Datastore', (done) => {
    dbUtil.getCollection({name: 'test2', persistent: true})
    .then((ds) => {
      done();
    })
  })

  it('should return an existing Datastore', (done) => {
    dbUtil.getCollection({name: 'test', persistent: false})
    .then((ds) => {
      done();
    })
  })
})
