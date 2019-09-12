"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var http_server_1 = require("./http.server");
var http_routes_1 = require("./http.routes");
var API = /** @class */ (function () {
    function API(port, options, util, dbUtil) {
        this.port = port;
        this.options = options;
        this.util = util;
        this.dbUtil = dbUtil;
        this.apiRoutes = new http_routes_1.HttpRoutes();
        this.httpServer = new http_server_1.HttpServer(this.apiRoutes, this.options.frontEndPath);
    }
    API.prototype.start = function () {
        var _this = this;
        return this.httpServer.start(this.port, this.routes())
            .then(function () {
            _this.util.log('api', 'info', 'api server listening on port ' + _this.port);
            return Promise.resolve();
        });
    };
    API.prototype.routes = function () {
        return [
            { path: '/api/blocks', method: 'get', controller: this.blocksController.bind(this) },
            { path: '/api/block/:id', method: 'get', controller: this.blockController.bind(this) },
            { path: '/api/tx/:id', method: 'get', controller: this.txController.bind(this) }
        ];
    };
    API.prototype.blocksController = function (req, res) {
        // this.dbUtil.
    };
    API.prototype.blockController = function (req, res) {
        var blockId = decodeURIComponent(req.params.id);
        if (blockId === parseInt(blockId, 10).toString()) {
            blockId = parseInt(blockId, 10);
        }
        console.log(blockId);
        this.dbUtil.getBlock(blockId, this.options.name)
            .then(function (block) {
            res.send(block);
        });
        // res.send(blockId)
    };
    API.prototype.txController = function (req, res) {
        var hash = decodeURIComponent(req.params.id);
        this.dbUtil.getTransaction(hash, this.options.name)
            .then(function (tx) {
            res.send(tx);
        });
        // console.log(hash)
        // res.send(hash)
    };
    return API;
}());
exports.API = API;
