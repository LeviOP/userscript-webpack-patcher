/*
 * The contents of this file are taken directly from the Vencord
 * project, with some modifications
 * Copyright (c) 2022 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

// Proxies demand that these properties be unmodified, so proxyLazy
// will always return the function default for them.
const unconfigurable = ["arguments", "caller", "prototype"];

const handler: ProxyHandler<any> = {};

const SYM_LAZY_GET = Symbol.for("userscriptWebpackPatcher.lazy.get");
const SYM_LAZY_CACHED = Symbol.for("userscriptWebpackPatcher.lazy.cached");

for (const method of [
    "apply",
    "construct",
    "defineProperty",
    "deleteProperty",
    "getOwnPropertyDescriptor",
    "getPrototypeOf",
    "has",
    "isExtensible",
    "ownKeys",
    "preventExtensions",
    "set",
    "setPrototypeOf"
] as const) {
    handler[method] =
        (target: any, ...args: any[]) => (Reflect[method] as (...args: any[]) => any)(target[SYM_LAZY_GET](), ...args);
}

handler.ownKeys = (target) => {
    const v = target[SYM_LAZY_GET]();
    const keys = Reflect.ownKeys(v);
    for (const key of unconfigurable) {
        if (!keys.includes(key)) keys.push(key);
    }
    return keys;
};

handler.getOwnPropertyDescriptor = (target, p) => {
    if (typeof p === "string" && unconfigurable.includes(p))
        return Reflect.getOwnPropertyDescriptor(target, p);

    const descriptor = Reflect.getOwnPropertyDescriptor(target[SYM_LAZY_GET](), p);

    if (descriptor) Object.defineProperty(target, p, descriptor);
    return descriptor;
};

/**
 * Wraps the result of {@link makeLazy} in a Proxy you can consume as if it wasn't lazy.
 * On first property access, the lazy is evaluated
 * @param factory lazy factory
 * @param attempts how many times to try to evaluate the lazy before giving up
 * @returns Proxy
 *
 * Note that the example below exists already as an api, see {@link findByPropsLazy}
 * @example const mod = proxyLazy(() => findByProps("blah")); console.log(mod.blah);
 */
export function proxyLazy<T>(factory: () => T, attempts = 5, isChild = false): T {
    let isSameTick = true;
    if (!isChild)
        setTimeout(() => isSameTick = false, 0);

    let tries = 0;
    const proxyDummy = Object.assign(function () { }, {
        [SYM_LAZY_CACHED]: void 0 as T | undefined,
        [SYM_LAZY_GET]() {
            if (!proxyDummy[SYM_LAZY_CACHED] && attempts > tries++) {
                proxyDummy[SYM_LAZY_CACHED] = factory();
                if (!proxyDummy[SYM_LAZY_CACHED] && attempts === tries)
                    console.error("[userscript-webpack-patcher] Lazy factory failed:", factory);
            }
            return proxyDummy[SYM_LAZY_CACHED];
        }
    });

    return new Proxy(proxyDummy, {
        ...handler,
        get(target, p, receiver) {
            if (p === SYM_LAZY_CACHED || p === SYM_LAZY_GET)
                return Reflect.get(target, p, receiver);

            // if we're still in the same tick, it means the lazy was immediately used.
            // thus, we lazy proxy the get access to make things like destructuring work as expected
            // meow here will also be a lazy
            // `const { meow } = findByPropsLazy("meow");`
            if (!isChild && isSameTick)
                return proxyLazy(
                    () => Reflect.get(target[SYM_LAZY_GET](), p, receiver),
                    attempts,
                    true
                );
            const lazyTarget = target[SYM_LAZY_GET]();
            if (typeof lazyTarget === "object" || typeof lazyTarget === "function") {
                return Reflect.get(lazyTarget, p, receiver);
            }
            throw Error("proxyLazy called on a primitive value");
        }
    }) as any;
}
