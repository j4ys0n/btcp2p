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
var DbUtil = /** @class */ (function () {
    function DbUtil() {
        this.datastores = {};
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
        var filePath = path.join(__dirname, '../../data', (filename + '.db'));
        var ds = new Datastore({ filename: filePath });
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
    DbUtil.prototype.saveBlock = function (name, block) {
        var blocks = this.getCollection({
            name: name + '-blocks',
            persistent: true
        }, { fieldName: 'hash', unique: true });
        return new Promise(function (resolve, reject) {
            blocks.then(function (ds) {
                ds.insert(block, function (err, doc) {
                    if (err) {
                        reject(err);
                    }
                    resolve(doc);
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
