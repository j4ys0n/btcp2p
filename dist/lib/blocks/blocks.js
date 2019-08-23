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
    }
    Blocks.prototype.startFetch = function (block) {
        var _this = this;
        this.blockList[this.options.genesisHash] = {
            requested: false,
            invReceived: false,
            blockReceived: false,
            height: 0
        };
        if (block.height === 0) {
            this.lastBlockChecked = this.options.genesisHash;
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
    Blocks.prototype.getHashOfBestBlock = function (currentHeight) {
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
        var hash = this.getHashOfBestBlock(currentHeight);
        this.util.log('block', 'debug', 'requesting blocks from peer');
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
            if (prevBlock !== undefined)
                if (_this.blockList[prevBlock] !== undefined) {
                    inFlight = true;
                }
        });
        return inFlight;
    };
    Blocks.prototype.checkForNewBlocks = function () {
        var _this = this;
        this.util.log('block', 'debug', 'checking for new blocks');
        // get current height, wait 1 second, see if it's the same.
        var currentHeight = this.scope.shared.internalHeight;
        setTimeout(function () {
            var nextCurrentHeight = _this.scope.shared.internalHeight;
            if (nextCurrentHeight > currentHeight) {
                //syncing
            }
            else {
                var inFlight = _this.inFlight();
                if (currentHeight < _this.scope.shared.externalHeight && !inFlight) {
                    // get next set of blocks
                    _this.requestBlocksFromPeer(currentHeight);
                }
                else if (currentHeight >= _this.scope.shared.externalHeight && !inFlight) {
                    if (!_this.scope.shared.synced) {
                        _this.requestBlocksFromPeer(currentHeight);
                        _this.scope.shared.synced = true;
                    }
                    _this.util.log('block', 'info', _this.options.name + ' chain fully synced');
                }
            }
        }, 500);
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
        // determine block numbers
        var calcHeight = function (hash) {
            var nextBlock = _this.blockList[hash].nextBlock;
            var height = _this.blockList[hash].height;
            if (nextBlock !== undefined &&
                nextBlock !== 'undefined' &&
                height !== undefined) {
                var nextHeight = height + 1;
                _this.blockList[nextBlock].height = nextHeight;
                _this.lastBlockChecked = hash;
                if (nextHeight > _this.scope.shared.internalHeight) {
                    // this.scope.shared.internalHeight = nextHeight;
                    if (_this.blocksInFlight[nextBlock]) {
                        delete _this.blocksInFlight[nextBlock];
                    }
                    _this.util.log('block', 'info', ['new block', nextHeight, nextBlock].join(' - '));
                    // console.log({...{hash: nextBlock}, ...this.blockList[nextBlock]});
                }
                // save to db, then move on
                if (height > _this.scope.shared.internalHeight &&
                    height < _this.scope.shared.externalHeight - 100) {
                    var block = _this.blockList[hash].data;
                    block.height = height;
                    block.nextBlock = _this.blockList[hash].nextBlock;
                    return _this.dbUtil.saveBlock(_this.options.name, block)
                        .then(function () {
                        _this.scope.shared.internalHeight = height;
                        calcHeight(nextBlock);
                    });
                }
                return calcHeight(nextBlock);
            }
            return Promise.resolve();
        };
        return calcHeight(this.lastBlockChecked);
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
