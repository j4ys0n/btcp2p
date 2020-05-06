import { Events, PropagateEvents } from './events';
export declare class InternalEvents extends Events {
    fire(event: string, payload: any, propagate: PropagateEvents): void;
}
