"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = __importDefault(require("express"));
var bodyParser = __importStar(require("body-parser"));
var http_routes_1 = require("./http.routes");
var HttpServer = /** @class */ (function () {
    function HttpServer(routes, frontEndPath) {
        this.routes = routes;
        this.frontEndPath = frontEndPath;
        this.server = express_1.default();
        this.server = express_1.default();
        this.config();
        this.routes = new http_routes_1.HttpRoutes();
    }
    HttpServer.prototype.config = function () {
        //support application/json type post data
        this.server.use(bodyParser.json());
        //support application/x-www-form-urlencoded post data
        this.server.use(bodyParser.urlencoded({ extended: false }));
        //CORS
        this.server.use(function (req, res, next) {
            res.header('Access-Control-Allow-Origin', '*');
            res.header('Access-Control-Allow-Methods', '*');
            res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
            next();
        });
        if (this.frontEndPath !== undefined) {
            console.log('frontend', __dirname + '/../../' + this.frontEndPath);
            this.server.use('/', express_1.default.static(this.frontEndPath));
        }
    };
    HttpServer.prototype.start = function (port, routes) {
        var _this = this;
        this.routes.setRoutes(this.server, routes);
        return new Promise(function (resolve, reject) {
            _this.server.listen(port, function () {
                resolve();
            });
        });
    };
    return HttpServer;
}());
exports.HttpServer = HttpServer;
