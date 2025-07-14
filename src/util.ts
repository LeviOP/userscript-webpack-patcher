import { proxyLazy } from "./lazy";
import { webpackRequire } from "./main";

export function findByProp(prop: string) {
    if (webpackRequire === undefined) throw Error("webpackRequire is undefined!");
    for (const id in webpackRequire.m) {
        const module = webpackRequire(id);
        if (module[prop] !== undefined) return module;
    }
}

export function findByPropLazy(prop: string) {
    return proxyLazy(() => findByProp(prop));
}
