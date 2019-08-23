"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var MessageConsts = /** @class */ (function () {
    function MessageConsts(util) {
        this.util = util;
        this.commands = {
            addr: this.util.commandStringBuffer('addr'),
            // alert: this.util.commandStringBuffer('alert'), // deprecated - removed
            block: this.util.commandStringBuffer('block'),
            blocktxn: this.util.commandStringBuffer('blocktxn'),
            cmpctblock: this.util.commandStringBuffer('cmpctblock'),
            // checkorder: this.util.commandStringBuffer('checkorder'), // deprecated
            feefilter: this.util.commandStringBuffer('feefilter'),
            getaddr: this.util.commandStringBuffer('getaddr'),
            getblocks: this.util.commandStringBuffer('getblocks'),
            getblocktxn: this.util.commandStringBuffer('getblocktxn'),
            getdata: this.util.commandStringBuffer('getdata'),
            getheaders: this.util.commandStringBuffer('getheaders'),
            headers: this.util.commandStringBuffer('headers'),
            inv: this.util.commandStringBuffer('inv'),
            mempool: this.util.commandStringBuffer('mempool'),
            merkleblock: this.util.commandStringBuffer('merkleblock'),
            notfound: this.util.commandStringBuffer('notfound'),
            ping: this.util.commandStringBuffer('ping'),
            pong: this.util.commandStringBuffer('pong'),
            reject: this.util.commandStringBuffer('reject'),
            // reply: this.util.commandStringBuffer('reply'), // deprecated
            sendcmpct: this.util.commandStringBuffer('sendcmpct'),
            sendheaders: this.util.commandStringBuffer('sendheaders'),
            // submitorder: this.util.commandStringBuffer('submitorder'), // deprecated
            tx: this.util.commandStringBuffer('tx'),
            verack: this.util.commandStringBuffer('verack'),
            version: this.util.commandStringBuffer('version') // send or receive version (part of handshake)
        };
    }
    return MessageConsts;
}());
exports.MessageConsts = MessageConsts;
