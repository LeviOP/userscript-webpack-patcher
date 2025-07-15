import { proxyLazy } from "./lazy";
import { webpackRequire } from "./main";

export function findByProps(...props: string[]) {
    for (const id in webpackRequire.m) {
        const module = webpackRequire(id);
        if (props.every((p) => Object.hasOwn(module, p))) return module;
    }
}

export function findByPropsLazy(...props: string[]) {
    return proxyLazy(() => findByProps(...props));
}

export function findByCode(...code: string[]) {
    for (const id in webpackRequire.m) {
        const factory = webpackRequire.m[id]!;
        const funcString = factory.toString();
        if (code.every((s) => funcString.includes(s))) return webpackRequire(id);
    }
}

export function findByCodeLazy(...code: string[]) {
    return proxyLazy(() => findByCode(...code));
}
