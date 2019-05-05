"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var events_1 = require("./events");
var InternalEvents = /** @class */ (function (_super) {
    __extends(InternalEvents, _super);
    function InternalEvents() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    InternalEvents.prototype.fire = function (event, payload, propagate) {
        _super.prototype.on.call(this, event, payload);
        if (propagate.client && this.scope.scopes) {
            this.scope.scopes.clientEvents.fire(event, payload);
        }
        if (propagate.server && this.scope.scopes) {
            this.scope.scopes.serverEvents.fire(event, payload);
        }
    };
    return InternalEvents;
}(events_1.Events));
exports.InternalEvents = InternalEvents;
