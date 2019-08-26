"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Blocks = /** @class */ (function () {
    function Blocks(scope, util, dbUtil, options) {
        this.scope = scope;
        this.util = util;
        this.dbUtil = dbUtil;
        this.options = options;
        this.blockList = {};
        this.blockCheckInterval = 15 * 1000;
        this.blocksInFlight = {};
        // wait until blocks have this many confirmations before saving to db.
        this.confirmationThreshold = 25;
    }
    Blocks.prototype.startFetch = function (block) {
        var _this = this;
        console.log(this.scope.shared);
        this.blockList[this.options.network.genesisHash] = {
            requested: false,
            invReceived: false,
            blockReceived: false,
            height: 0
        };
        if (block.height === 0) {
            this.lastBlockChecked = this.options.network.genesisHash;
        }
        else {
            this.lastBlockChecked = block.hash;
        }
        this.dbUtil.getBlocksForCache(this.options.name)
            .then(function (blocks) {
            blocks.forEach(function (b) {
                _this.blockList[b.hash] = {
                    blockReceived: true,
                    height: b.height,
                    prevBlock: b.prevBlock,
                    nextBlock: b.nextBlock
                };
            });
            _this.util.log('block', 'debug', 'block list loaded');
        })
            .then(function () {
            _this.blockCheckTimer = setInterval(function () {
                _this.groomBlockList()
                    .then(function () {
                    _this.checkForNewBlocks();
                });
            }, _this.blockCheckInterval);
            _this.groomBlockList()
                .then(function () {
                _this.checkForNewBlocks();
            });
        });
    };
    Blocks.prototype.getBlockHashAtHeight = function (currentHeight) {
        var _this = this;
        var hashes = Object.keys(this.blockList);
        var hash = '';
        hashes.some(function (h) {
            if (_this.blockList[h].height === currentHeight) {
                hash = h;
                return true;
            }
            return false;
        });
        return hash;
    };
    Blocks.prototype.requestBlocksFromPeer = function (currentHeight) {
        var hash = this.getBlockHashAtHeight(currentHeight);
        this.util.log('block', 'debug', 'requesting blocks from peer');
        console.log(this.scope.shared);
        this.scope.message.sendGetBlocks(hash);
    };
    Blocks.prototype.inFlight = function () {
        var _this = this;
        var blocksInFlight = Object.keys(this.blocksInFlight);
        if (blocksInFlight.length === 0) {
            return false;
        }
        // check to see if blocks are synced and don't have a height,
        // that means they're likely newer blocks (not part of hisotric sync)
        var inFlight = false;
        blocksInFlight.forEach(function (b) {
            var prevBlock = _this.blockList[b].prevBlock;
            if (prevBlock !== undefined) {
                if (_this.blockList[prevBlock] !== undefined) {
                    inFlight = true;
                }
            }
        });
        return inFlight;
    };
    Blocks.prototype.checkForNewBlocks = function () {
        this.util.log('block', 'debug', 'checking for new blocks');
        var currentHeight = this.scope.shared.internalHeight;
        var inFlight = this.inFlight();
        if (currentHeight < this.scope.shared.externalHeight &&
            !inFlight) {
            // get next set of blocks
            this.requestBlocksFromPeer(currentHeight);
        }
        else {
            this.checkIfFullySynced();
        }
    };
    Blocks.prototype.checkIfFullySynced = function () {
        var currentHeight = this.scope.shared.internalHeight;
        if (currentHeight >= this.scope.shared.externalHeight &&
            !this.scope.shared.synced) {
            this.chainFullySynced(currentHeight);
        }
    };
    Blocks.prototype.chainFullySynced = function (height) {
        clearInterval(this.blockCheckTimer);
        //run one more time in case there's a gap
        this.requestBlocksFromPeer(height);
        this.scope.shared.synced = true;
        this.util.log('block', 'info', this.options.name + ' chain fully synced');
    };
    Blocks.prototype.saveNextBlock = function () {
        var _this = this;
        var nextBlockHeightToSave = this.scope.shared.dbHeight + 1;
        var nextBlockHashToSave = this.getBlockHashAtHeight(nextBlockHeightToSave);
        if (nextBlockHashToSave !== undefined) {
            var nextBlockToSave = this.blockList[nextBlockHashToSave].data;
            return this.dbUtil.saveBlock(this.options.name, nextBlockToSave)
                .then(function () {
                _this.scope.shared.dbHeight = nextBlockHeightToSave;
                return Promise.resolve();
            });
        }
        return Promise.reject(nextBlockHeightToSave);
    };
    Blocks.prototype.calcBlockHeight = function (hash) {
        var _this = this;
        var nextBlock = this.blockList[hash].nextBlock;
        var height = this.blockList[hash].height;
        if (nextBlock !== undefined &&
            nextBlock !== 'undefined' && // TODO is this a bug?
            height !== undefined) {
            var nextHeight_1 = height + 1;
            this.blockList[nextBlock].height = nextHeight_1;
            this.lastBlockChecked = hash;
            if (nextHeight_1 > this.scope.shared.internalHeight) {
                // this.scope.shared.internalHeight = nextHeight;
                if (this.blocksInFlight[nextBlock]) {
                    delete this.blocksInFlight[nextBlock];
                }
                this.util.log('block', 'info', ['new block', nextHeight_1, nextBlock].join(' - '));
            }
            if (this.scope.shared.synced && nextHeight_1 > this.scope.shared.externalHeight) {
                this.scope.shared.externalHeight = nextHeight_1;
                return this.saveNextBlock()
                    .then(function () {
                    _this.scope.shared.internalHeight = nextHeight_1;
                    return _this.calcBlockHeight(nextBlock);
                })
                    .catch(function (error) {
                    _this.util.log('block', 'warn', ['saveNextBlock, blockList[height].data not saved', error].join(' - '));
                    return Promise.resolve();
                });
            }
            // save to db, then move on
            console.log('height', height, 'internalHeight', this.scope.shared.internalHeight, 'externalHeight', this.scope.shared.externalHeight);
            if (height > this.scope.shared.internalHeight &&
                height < this.scope.shared.externalHeight - this.confirmationThreshold - 1) {
                // TODO how can it get here if data not set?
                if (this.blockList[hash].data !== undefined) {
                    return this.prepareBlockAndSave(hash, height, nextBlock);
                }
                return Promise.resolve();
            }
            else if (height > this.scope.shared.internalHeight &&
                height >= this.scope.shared.externalHeight - this.confirmationThreshold - 1) {
                // TODO how can it get here if data not set?
                if (this.blockList[hash].data !== undefined) {
                    return this.prepareBlockAndSave(hash, height, nextBlock, false);
                }
                return Promise.resolve();
            }
            this.scope.shared.internalHeight = height;
            return this.calcBlockHeight(nextBlock);
        }
        return Promise.resolve();
    };
    Blocks.prototype.prepareBlockAndSave = function (hash, height, nextBlock, keep) {
        var _this = this;
        if (keep === void 0) { keep = true; }
        var block = this.blockList[hash].data;
        block.height = height;
        block.nextBlock = this.blockList[hash].nextBlock;
        this.util.log('block', 'info', ['saving block', height].join(' - '));
        return this.dbUtil.saveBlock(this.options.name, block, keep)
            .then(function () {
            _this.scope.shared.dbHeight = height;
            _this.scope.shared.internalHeight = height;
            return _this.calcBlockHeight(nextBlock);
        });
    };
    Blocks.prototype.groomBlockList = function () {
        var _this = this;
        var blocks = Object.keys(this.blockList);
        // link the list
        // backwards
        blocks.forEach(function (block) {
            var prevBlock = _this.blockList[block].prevBlock;
            if (_this.blockList[prevBlock] !== undefined) {
                _this.blockList[prevBlock].nextBlock = block;
            }
            else {
                _this.blockList[prevBlock] = {
                    nextBlock: block,
                    blockReceived: false
                };
            }
        });
        // forwards
        blocks.forEach(function (block) {
            var nextBlock = _this.blockList[block].nextBlock;
            if (_this.blockList[nextBlock] !== undefined) {
                _this.blockList[nextBlock].prevBlock = block;
            }
            else {
                _this.blockList[nextBlock] = {
                    prevBlock: block,
                    blockReceived: false
                };
            }
        });
        // determine block numbers and save blocks
        return this.calcBlockHeight(this.lastBlockChecked);
    };
    Blocks.prototype.updateBlockInFlight = function (hash) {
        this.blocksInFlight[hash] = true;
    };
    Blocks.prototype.updateBlockList = function (block) {
        if (this.blockList[block.hash] === undefined) {
            this.blockList[block.hash] = {
                blockReceived: true,
                prevBlock: block.prevBlock,
                data: block
            };
        }
        else {
            this.blockList[block.hash].blockReceived = true;
            this.blockList[block.hash].prevBlock = block.prevBlock;
            this.blockList[block.hash].data = block;
        }
        if (this.blockList[block.prevBlock] === undefined) {
            this.blockList[block.prevBlock] = {
                blockReceived: false,
                nextBlock: block.hash
            };
        }
        else {
            this.blockList[block.prevBlock].nextBlock = block.hash;
        }
        if (this.blockList[block.prevBlock].height !== undefined) {
            var blockHeight = this.blockList[block.prevBlock].height;
            blockHeight++;
            this.blockList[block.hash].height = blockHeight;
        }
        if (this.scope.shared.synced) {
            this.groomBlockList();
        }
    };
    Blocks.prototype.updateBlockListWithInv = function (blockInv) {
        if (this.blockList[blockInv.hash] === undefined) {
            this.blockList[blockInv.hash] = {
                invReceived: true,
                blockReceived: false
            };
        }
        else {
            this.blockList[blockInv.hash].invReceived = true;
        }
    };
    return Blocks;
}());
exports.Blocks = Blocks;
