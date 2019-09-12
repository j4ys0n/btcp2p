import * as express from 'express';
import { HttpRoutes } from './http.routes';
export declare class HttpServer {
    private routes;
    private frontEndPath;
    server: express.Application;
    constructor(routes: HttpRoutes, frontEndPath: string | undefined);
    private config;
    start(port: number, routes: Array<any>): Promise<any>;
}
