import { Events, PropagateEvents } from './events';

export class InternalEvents extends Events {
  public fire(event: string, payload: any, propagate: PropagateEvents): void {
    super.on(event, payload);
    if (propagate.client && this.scope.scopes) {
      this.scope.scopes.clientEvents.fire(event, payload);
    }
    if (propagate.server && this.scope.scopes) {
      this.scope.scopes.serverEvents.fire(event, payload);
    }
  }
}
