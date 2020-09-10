class GEOOSEvents {
    constructor() {
        this.events = {}
    }

    on(producerName, eventName, handler) {
        let producerEvents = this.events[producerName];
        if (!producerEvents) {
            producerEvents = {};
            this.events[producerName] = producerEvents;
        }
        let handlers = producerEvents[eventName];
        if (!handlers) {
            handlers = [];
            producerEvents[eventName] = handlers;
        }
        if (handlers.includes(handler)) throw "Handler already registered for event " + producerName + "." + eventName;
        handlers.push(handler);
    }

    remove(handler) {
        Object.keys(this.events).forEach(producerName => {
            let producerEvents = this.events[producerName];
            Object.keys(producerEvents).forEach(eventName => {
                let handlers = producerEvents[eventName];
                let p = handlers.indexOf(handler);
                if (p >= 0) handlers.splice(p, 1);
            })
        })
    }

    trigger(producerName, eventName, eventData) {
        return new Promise((resolve, reject) => {
            let producerEvents = this.events[producerName];
            if (!producerEvents) {resolve(); return};
            let handlers = producerEvents[eventName];
            if (!handlers || !handlers.length) {resolve(); return}
            let promises = handlers.reduce((list, handler) => {
                let r = handler(eventData);
                if (r instanceof Promise) list.push(r);
                return list;
            }, [])
            Promise.all(promises)
                .then(_ => resolve())
                .catch(err => reject(err));
        });
    }
}