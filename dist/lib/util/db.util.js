"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var path = require("path");
var Datastore = require("nestdb");
var general_util_1 = require("../util/general.util");
var DbUtil = /** @class */ (function () {
    function DbUtil(engine, protocol, dbPath) {
        if (engine === void 0) { engine = 'nest'; }
        if (dbPath === void 0) { dbPath = undefined; }
        this.engine = engine;
        this.protocol = protocol;
        this.dbPath = dbPath;
        this.util = new general_util_1.Utils();
        this.datastores = {};
        this.onHold = {};
    }
    DbUtil.prototype.getCollection = function (options, index) {
        if (index === void 0) { index = undefined; }
        return __awaiter(this, void 0, void 0, function () {
            var ds, collection, datastore;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        ds = this.datastores[options.name];
                        if (!(ds !== undefined)) return [3 /*break*/, 1];
                        return [2 /*return*/, Promise.resolve(ds)];
                    case 1:
                        collection = void 0;
                        if (options.persistent) {
                            collection = this.loadCollection(options.name);
                        }
                        else {
                            collection = this.memoryCollection();
                        }
                        return [4 /*yield*/, collection];
                    case 2:
                        datastore = _a.sent();
                        if (index !== undefined) {
                            datastore.ensureIndex(index);
                        }
                        this.datastores[options.name] = datastore;
                        return [2 /*return*/, this.datastores[options.name]];
                }
            });
        });
    };
    DbUtil.prototype.loadCollection = function (filename) {
        var dbPath = path.join(__dirname, '../../data', (filename + '.db'));
        if (this.dbPath !== undefined) {
            dbPath = path.join(this.dbPath, (filename + '.db'));
        }
        var ds = new Datastore({ filename: dbPath });
        return new Promise(function (resolve, reject) {
            ds.load(function (err) {
                if (err) {
                    /* istanbul ignore next */
                    reject(new Error(err));
                }
                else {
                    resolve(ds);
                }
            });
        });
    };
    DbUtil.prototype.memoryCollection = function () {
        return Promise.resolve(new Datastore());
    };
    DbUtil.prototype.saveTxToMempool = function (name, tx) {
        var mempool = this.getCollection({
            name: name + '-mempool',
            persistent: true
        });
        return mempool.then(function (ds) {
            // save tx to mempool collection
        });
    };
    DbUtil.prototype.getHeldBlocks = function (name) {
        var blocks = this.getCollection({
            name: name + '-blocks',
            persistent: false
        }, { fieldName: 'hash', unique: true });
        return new Promise(function (resolve, reject) {
            blocks.then(function (ds) {
                ds.find({}, function (err, docs) {
                    if (err) {
                        reject(err);
                    }
                    resolve(docs);
                });
            });
        });
    };
    DbUtil.prototype.addToHeldBlocks = function (hash, height) {
        this.onHold[hash] = height;
    };
    DbUtil.prototype.deleteBlockFromHold = function (name, hash) {
        var _this = this;
        var blocks = this.getCollection({
            name: name + '-blocks',
            persistent: false
        }, { fieldName: 'hash', unique: true });
        return new Promise(function (resolve, reject) {
            blocks.then(function (ds) {
                ds.remove({ hash: hash }, function (err, doc) {
                    if (err) {
                        reject(err);
                    }
                    delete _this.onHold[hash];
                    _this.util.log('db', 'info', hash + ' removed hold');
                    resolve(doc);
                });
            });
        });
    };
    DbUtil.prototype.getTransaction = function (txid, name) {
        var _this = this;
        var txes = this.getCollection({
            name: name + '-txes',
            persistent: true
        }, { fieldName: 'txid', unique: true });
        var blocks = this.getCollection({
            name: name + '-blocks',
            persistent: true
        }, { fieldName: 'txid', unique: true });
        return txes.then(function (txds) {
            return _this.findTransaction(txid, txds)
                .then(function (txRef) {
                if (txRef !== null) {
                    return blocks.then(function (blkds) {
                        return _this.findBlock(txRef.blockHash, blkds)
                            .then(function (block) {
                            if (block === null) {
                                _this.util.log('db', 'warn', ['block not found', txRef.blockHash].join(' - '));
                                return Promise.resolve();
                            }
                            var filtered = block.transactions.filter(function (tx) {
                                if (tx.txid === txRef.txid) {
                                    return true;
                                }
                                return false;
                            });
                            if (filtered.length === 1) {
                                return Promise.resolve(filtered[0]);
                            }
                            _this.util.log('db', 'warn', ['tx not found', txRef.txid, 'in block', txRef.blockHash].join(' - '));
                            return Promise.resolve(null);
                        });
                    });
                }
                return Promise.resolve();
            });
        });
    };
    DbUtil.prototype.findTransaction = function (txid, ds) {
        return new Promise(function (resolve, reject) {
            ds.findOne({ txid: txid }, function (err, doc) {
                if (err) {
                    reject(err);
                }
                resolve(doc);
            });
        });
    };
    DbUtil.prototype.saveTransaction = function (txid, name, height, blockHash) {
        var _this = this;
        var tx = {
            txid: txid,
            height: height,
            blockHash: blockHash
        };
        var txes = this.getCollection({
            name: name + '-txes',
            persistent: true
        }, { fieldName: 'txid', unique: true });
        return new Promise(function (resolve, reject) {
            txes.then(function (ds) {
                _this.findTransaction(txid, ds)
                    .then(function (result) {
                    if (result !== null) {
                        _this.util.log('db', 'info', ['tx already saved', result.txid].join(' - '));
                        resolve();
                    }
                    else {
                        ds.insert(tx, function (err, doc) {
                            if (err) {
                                reject(err);
                            }
                            resolve(doc);
                        });
                    }
                });
            });
        });
    };
    DbUtil.prototype.indexTransactions = function (name, block) {
        var txHashes = [];
        block.transactions.forEach(function (tx) {
            txHashes.push(tx.txid);
        });
        return this.util.promiseLoop(this.saveTransaction, this, txHashes, [name, block.height, block.hash]);
    };
    DbUtil.prototype.getBlock = function (id, name) {
        var _this = this;
        var blocks = this.getCollection({
            name: name + '-blocks',
            persistent: true
        });
        return new Promise(function (resolve, reject) {
            blocks.then(function (ds) {
                _this.findBlock(id, ds)
                    .then(function (block) {
                    resolve(block);
                });
            });
        });
    };
    DbUtil.prototype.findBlock = function (id, ds) {
        if (typeof id === 'number') {
            return this.findBlockByHeight(id, ds);
        }
        return this.findBlockByHash(id, ds);
    };
    DbUtil.prototype.findBlockByHeight = function (height, ds) {
        return new Promise(function (resolve, reject) {
            ds.findOne({ height: height }, function (err, doc) {
                if (err) {
                    reject(err);
                }
                resolve(doc);
            });
        });
    };
    DbUtil.prototype.findBlockByHash = function (hash, ds) {
        return new Promise(function (resolve, reject) {
            ds.findOne({ hash: hash }, function (err, doc) {
                if (err) {
                    reject(err);
                }
                resolve(doc);
            });
        });
    };
    DbUtil.prototype.stripShieldedTxData = function (block) {
        block.transactions.forEach(function (tx) {
            tx.shieldedInputs.forEach(function (input) {
                input.anchor = '';
                input.cv = '';
                input.nullifier = '';
                input.rk = '';
                input.spendAuthSig = '';
            });
            tx.shieldedOutputs.forEach(function (output) {
                output.cmu = '';
                output.cv = '';
                output.encCyphertext = '';
                output.ephemeralKey = '';
                output.outCyphertext = '';
            });
        });
        return block;
    };
    DbUtil.prototype.saveBlock = function (name, block, confirmed) {
        var _this = this;
        if (confirmed === void 0) { confirmed = true; }
        var blocks = this.getCollection({
            name: name + '-blocks',
            persistent: confirmed
        }, { fieldName: 'hash', unique: true });
        if (confirmed) {
            // this.deleteBlockFromHold(name, block.hash);
        }
        else {
        }
        return new Promise(function (resolve, reject) {
            blocks.then(function (ds) {
                // strip some data to keep our db size under control
                if (_this.protocol === 'zcash') {
                    block = _this.stripShieldedTxData(block);
                }
                ds.insert(block, function (err, doc) {
                    if (err) {
                        reject(err);
                    }
                    _this.indexTransactions(name, block)
                        .then(function () {
                        resolve(doc);
                    });
                });
            });
        });
    };
    DbUtil.prototype.getBestBlockHeight = function (name) {
        var blocks = this.getCollection({
            name: name + '-blocks',
            persistent: true
        });
        return new Promise(function (resolve, reject) {
            blocks.then(function (ds) {
                ds.find({}).sort({ height: -1 }).limit(1).exec(function (err, blocks) {
                    if (err) {
                        return reject(err);
                    }
                    var height = (blocks[0] !== undefined) ? blocks[0].height : 0;
                    var hash = (blocks[0] !== undefined) ? blocks[0].hash : '';
                    return resolve({ height: height, hash: hash });
                });
            });
        });
    };
    DbUtil.prototype.getBlocksForCache = function (name) {
        var blocks = this.getCollection({
            name: name + '-blocks',
            persistent: true
        });
        return new Promise(function (resolve, reject) {
            blocks.then(function (ds) {
                ds.find({}, { hash: 1, height: 1, prevBlock: 1, nextBlock: 1 }).exec(function (err, blocks) {
                    if (err) {
                        return reject(err);
                    }
                    return resolve(blocks);
                });
            });
        });
    };
    return DbUtil;
}());
exports.DbUtil = DbUtil;
