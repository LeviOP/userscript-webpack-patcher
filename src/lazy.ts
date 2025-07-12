const SYM_LAZY_CACHED = Symbol("proxyLazy.cached");
const SYM_LAZY_GET = Symbol("proxyLazy.get");

export function proxyLazy<T>(factory: () => T, isChild = false): T {
    let isSameTick = true;
    if (!isChild) {
        setTimeout(() => {
            isSameTick = false;
        }, 0);
    }

    const proxyDummy = Object.assign(function () {}, {
        [SYM_LAZY_CACHED]: undefined as T | undefined,
        [SYM_LAZY_GET]() {
            if (!proxyDummy[SYM_LAZY_CACHED]) {
                proxyDummy[SYM_LAZY_CACHED] = factory();
                if (!proxyDummy[SYM_LAZY_CACHED])
                    throw new Error("proxyLazy: factory returned undefined");
            }
            return proxyDummy[SYM_LAZY_CACHED];
        }
    });

    return new Proxy(proxyDummy, {
        get(target, prop, receiver) {
            if (prop === SYM_LAZY_CACHED || prop === SYM_LAZY_GET) {
                return Reflect.get(target, prop, receiver);
            }

            if (!isChild && isSameTick) {
                // Create a sub-proxy for things like destructuring
                return proxyLazy(
                    () => Reflect.get(target[SYM_LAZY_GET](), prop, receiver),
                    true
                );
            }

            const value = target[SYM_LAZY_GET]();
            if (typeof value === "object" || typeof value === "function") {
                return Reflect.get(value, prop, receiver);
            }

            throw new Error("proxyLazy: attempted to access property of a primitive");
        },

        apply(target, thisArg, args) {
            const fn = target[SYM_LAZY_GET]();
            if (typeof fn !== "function")
                throw new TypeError("proxyLazy: target is not callable");
            return Reflect.apply(fn, thisArg, args);
        }
    }) as any;
}
