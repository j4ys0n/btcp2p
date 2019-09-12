import * as  express from 'express';
import * as bodyParser from 'body-parser';
import { HttpRoutes } from './http.routes';

export class HttpServer {
  public server: express.Application;

  constructor(
    private routes: HttpRoutes,
    private frontEndPath: string | undefined
  ) {
    this.server = express();
    this.config();
    this.routes = new HttpRoutes();
  }

  private config(): void {
    //support application/json type post data
    this.server.use(bodyParser.json());

    //support application/x-www-form-urlencoded post data
    this.server.use(bodyParser.urlencoded({ extended: false}));

    //CORS
    this.server.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', '*');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
      next();
    });

    if (this.frontEndPath !== undefined) {
      console.log('frontend', __dirname + '/../../' + this.frontEndPath)
      this.server.use('/', express.static(this.frontEndPath));
    }
  }

  public start(port: number, routes: Array<any>): Promise<any> {
    this.routes.setRoutes(this.server, routes);
    return new Promise((resolve, reject) => {
      this.server.listen(port, () => {
        resolve();
      });
    });
  }
}
