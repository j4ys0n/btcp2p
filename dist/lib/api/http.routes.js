"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var HttpRoutes = /** @class */ (function () {
    function HttpRoutes() {
    }
    HttpRoutes.prototype.setRoutes = function (server, routes) {
        routes.forEach(function (route) {
            server.route(route.path)[route.method](route.controller);
        });
    };
    return HttpRoutes;
}());
exports.HttpRoutes = HttpRoutes;
