import * as express from 'express';
import { Route } from '../interfaces/api.interface';
export declare class HttpRoutes {
    constructor();
    setRoutes(server: express.Application, routes: Array<Route>): void;
}
