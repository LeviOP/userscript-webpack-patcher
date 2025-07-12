import type { ChunkId, WebpackChunk, WebpackGlobal, WebpackRequire } from "./webpack";

const INJECTED_ARGNAME = "__injected__";

export interface Replacement {
    match: string | RegExp;
    replace: string;
}

export interface Patch {
    find: string | RegExp;
    replacement: Replacement[];
    inject?: Record<string, any>;
}

export interface PatchedPush {
    (chunk: WebpackChunk): void;

    $$patches: Patch[];
    $$original: Array<WebpackChunk>["push"];
}

interface WebpackPatcherOptions {
    globalName: string;
    patches: Patch[];
}

type WebpackGlobalPatched = Array<WebpackChunk> & {
    push: PatchedPush;
};

function isPatched(global: WebpackGlobal): global is WebpackGlobalPatched {
    return "$$original" in global.push;
}

const define: typeof Reflect.defineProperty = (target, p, attributes) => {
    if (Object.hasOwn(attributes, "value")) {
        attributes.writable = true;
    }

    return Reflect.defineProperty(target, p, {
        configurable: true,
        enumerable: true,
        ...attributes
    });
};

let globalName: string;
let patches: Patch[];
export let webpackRequire: WebpackRequire;

export function init(options: WebpackPatcherOptions) {
    globalName = options.globalName;
    patches = options.patches;

    define(Function.prototype, "m", {
        enumerable: false,

        set(this: WebpackRequire, originalModules: WebpackRequire["m"]) {
            define(this, "m", { value: originalModules });
            webpackRequire = this;
            Reflect.deleteProperty(Function.prototype, "m");
        }
    });

    let webpackGlobal: unknown;
    Object.defineProperty(unsafeWindow, globalName, {
        configurable: true,

        get: () => webpackGlobal,
        set: (v: unknown) => {
            if (!Array.isArray(v)) {
                console.error("[userscript-webpack-patcher] webpackGlobal was not an array! Not patching.");
            } else {
                if (!isPatched(v)) patchPush(v);
            }
            webpackGlobal = v;
        }
    });
}

const patchedChunks = new Set<ChunkId>();

function patchPush(webpackGlobal: unknown[]) {
    console.log("patching something");
    // TODO: we are assuming (asserting) that calls to webpackGlobal.push _will_ be WebpackChunks. Not type safe
    const handlePush: PatchedPush = function handlePush(chunk: WebpackChunk) {
        if (patchedChunks.has(chunk[0][0])) return handlePush.$$original.call(webpackGlobal, chunk);
        try {
            patchChunk(chunk, handlePush.$$patches);
        } catch (err) {
            console.log("Error in handlePush", err);
        }
    };

    handlePush.$$patches = patches;

    handlePush.$$original = webpackGlobal.push;

    // Prevent recursive patching
    handlePush.bind = (thisArg: any, ...args: any) => handlePush.$$original.bind(thisArg, ...args);

    Object.defineProperty(webpackGlobal, "push", {
        configurable: true,
        get: () => handlePush,
        set(v) {
            handlePush.$$original = v;
        }
    });
}

function patchChunk([[chunkId], factories, callback]: WebpackChunk, patches: Patch[]) {
    patchedChunks.add(chunkId);
    console.log("Patching chunk", chunkId);

    const toInject: Array<any> = [];

    const patchedFactories = Object.entries(factories).map<[string, string]>(([id, factory]) => {
        let funcString = factory.toString();
        for (const patch of patches) {
            if (!(typeof patch.find === "string" ? funcString.includes(patch.find) : funcString.match(patch.find))) continue;
            for (const replacement of patch.replacement) {
                replacement.replace = replacement.replace.replaceAll(/\$\[([^\]].+?)\]/g, (_, name: string) => {
                    const varToInject = patch.inject?.[name];
                    if (varToInject === undefined) throw Error("injected varibale does not exist");
                    return INJECTED_ARGNAME + "[" + (toInject.push(varToInject) - 1) + "]";
                });
                funcString = funcString.replace(replacement.match, replacement.replace);
            }
        }
        return [id, funcString];
    });

    const script = document.createElement("script") as HTMLScriptElement & Partial<{ run: (inject: any[]) => void }>;
    script.textContent = `document.currentScript.run = ((${INJECTED_ARGNAME}) => {` +
        `(self.${globalName} = self.${globalName} || []).push([` +
        `[${chunkId}],{\n` +
        patchedFactories.map(([id, funcString]) => `${id}: ${funcString}`).join(",\n") +
        "}" + (callback ? ",\n" + callback.toString() : "") +
        "\n])})";
    document.documentElement.appendChild(script);
    if (typeof script.run !== "function") throw Error("Expected script to have run function!");
    script.run(toInject);
    script.remove();
}

export class WebpackPatcher {
    globalName: string;
    patches: Patch[];
    webpackRequire?: WebpackRequire;
    patchedChunks = new Set<ChunkId>();

    constructor(options: WebpackPatcherOptions) {
        this.globalName = options.globalName;
        this.patches = options.patches;

        // const webpackGlobal = (window as typeof window & Record<string, unknown>)[this.globalName];
        // if (webpackGlobal !== undefined) {
        //     if (!Array.isArray(webpackGlobal)) throw Error("Expected webpackGlobal to be an array!");
        // }

        this.init();
    }

    init() {
        const self = this;
        define(Function.prototype, "m", {
            enumerable: false,

            set(this: WebpackRequire, originalModules: WebpackRequire["m"]) {
                define(this, "m", { value: originalModules });
                self.webpackRequire = this;
                Reflect.deleteProperty(Function.prototype, "m");
            }
        });

        let webpackGlobal: unknown;
        Object.defineProperty(unsafeWindow, this.globalName, {
            configurable: true,

            get: () => webpackGlobal,
            set: (v: unknown) => {
                if (!Array.isArray(v)) {
                    console.error("[userscript-webpack-patcher] webpackGlobal was not an array! Not patching.");
                } else {
                    if (!isPatched(v)) this.patchPush(v);
                }
                webpackGlobal = v;
            }
        });
    }

    patchPush(webpackGlobal: unknown[]) {
        const self = this;
        console.log("patching something");
        // TODO: we are assuming (asserting) that calls to webpackGlobal.push _will_ be WebpackChunks. Not type safe
        const handlePush: PatchedPush = function handlePush(chunk: WebpackChunk) {
            if (self.patchedChunks.has(chunk[0][0])) return handlePush.$$original.call(webpackGlobal, chunk);
            try {
                self.patchChunk(chunk, handlePush.$$patches);
            } catch (err) {
                console.log("Error in handlePush", err);
            }
        };

        handlePush.$$patches = this.patches;

        handlePush.$$original = webpackGlobal.push;

        // Prevent recursive patching
        handlePush.bind = (thisArg: any, ...args: any) => handlePush.$$original.bind(thisArg, ...args);

        Object.defineProperty(webpackGlobal, "push", {
            configurable: true,
            get: () => handlePush,
            set(v) {
                handlePush.$$original = v;
            }
        });
    }

    patchChunk([[chunkId], factories, callback]: WebpackChunk, patches: Patch[]) {
        this.patchedChunks.add(chunkId);
        console.log("Patching chunk", chunkId);

        const toInject: Array<any> = [];

        const patchedFactories = Object.entries(factories).map<[string, string]>(([id, factory]) => {
            let funcString = factory.toString();
            for (const patch of patches) {
                if (!(typeof patch.find === "string" ? funcString.includes(patch.find) : funcString.match(patch.find))) continue;
                for (const replacement of patch.replacement) {
                    replacement.replace = replacement.replace.replaceAll(/\$\[([^\]].+?)\]/g, (_, name: string) => {
                        const varToInject = patch.inject?.[name];
                        if (varToInject === undefined) throw Error("injected varibale does not exist");
                        return INJECTED_ARGNAME + "[" + (toInject.push(varToInject) - 1) + "]";
                    });
                    funcString = funcString.replace(replacement.match, replacement.replace);
                }
            }
            return [id, funcString];
        });

        const script = document.createElement("script") as HTMLScriptElement & Partial<{ run: (inject: any[]) => void }>;
        script.textContent = `document.currentScript.run = ((${INJECTED_ARGNAME}) => {
            (self.${this.globalName} = self.${this.globalName} || []).push([
                [${chunkId}],
                {
                    ${patchedFactories.map(([id, funcString]) => `${id}: ${funcString}`).join(",\n")}
                }${callback ? "," + callback.toString() : ""}
            ])
        });`;
        document.documentElement.appendChild(script);
        if (typeof script.run !== "function") throw Error("Expected script to have run function!");
        script.run(toInject);
        script.remove();
    }
}
