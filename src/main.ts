import type { ModuleFactory, WebpackRequire } from "./webpack";

const INJECTED_ARGNAME = "__injected__";
const SCRIPT_RUNNAME = "__run__";

export interface Replacement {
    match: string | RegExp;
    replace: string;
}

export interface Patch {
    find: string | RegExp;
    replacement: Replacement[];
    inject?: Record<string, any>;
}

interface WebpackPatcherOptions {
    patches: Patch[];
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

function ourEval(string: string, injected: any[]): any {
    const script = document.createElement("script") as any;
    script.textContent = `document.currentScript["${SCRIPT_RUNNAME}"] = ((${INJECTED_ARGNAME}) => {\n` +
        "return " + string + ";\n" +
        "});";
    document.documentElement.appendChild(script);
    if (typeof script[SCRIPT_RUNNAME] !== "function") throw Error("Expected script to have run function!");
    const result = script[SCRIPT_RUNNAME](injected);
    script.remove();
    return result;
}

export let webpackRequire: WebpackRequire;
let gPatches: Patch[];

const moduleFactoriesHandler: ProxyHandler<WebpackRequire["m"]> = {
    set(moduleFactories, moduleId: PropertyKey, factory: ModuleFactory): boolean {
        const toInject: Array<any> = [];
        const originalCode = factory.toString();
        let funcString = originalCode;
        for (const patch of gPatches) {
            if (!(typeof patch.find === "string" ? funcString.includes(patch.find) : funcString.match(patch.find))) continue;
            const alreadyInjected = new Map<string, number>();
            for (const replacement of patch.replacement) {
                replacement.replace = replacement.replace.replaceAll(/\$\[([^\]].+?)\]/g, (_, name: string) => {
                    const varToInject = patch.inject?.[name];
                    if (varToInject === undefined) throw Error(`[userscript-webpack-patcher] Injected varibale "${name}" does not exist!`);
                    let injectedIndex = alreadyInjected.get(name);
                    if (injectedIndex === undefined) {
                        injectedIndex = toInject.push(varToInject) - 1;
                        alreadyInjected.set(name, injectedIndex);
                    }
                    return INJECTED_ARGNAME + "[" + injectedIndex + "]";
                });
                funcString = funcString.replace(replacement.match, replacement.replace);
            }
        }

        const func = originalCode === funcString ? factory : ourEval(funcString, toInject);
        return Reflect.set(moduleFactories, moduleId, func);
    }
};

type PatchShareCallback = (wreq: WebpackRequire) => Patch[];

const patchShareCallbacks: PatchShareCallback[] = [];

export function init({ patches }: WebpackPatcherOptions) {
    if (!Object.prototype.hasOwnProperty.call(Function.prototype, "m")) {
        define(Function.prototype, "m", {
            enumerable: false,

            set(this: WebpackRequire, value: WebpackRequire["m"] | PatchShareCallback) {
                if (typeof value === "function") {
                    patchShareCallbacks.push(value);
                    return;
                }

                gPatches = patchShareCallbacks.map((callback) => callback(this)).flat();
                const proxiedModuleFactories = new Proxy(value, moduleFactoriesHandler);

                define(this, "m", { value: proxiedModuleFactories });
                Reflect.deleteProperty(Function.prototype, "m");
            }
        });
    }
    (Function.prototype as Function & { m: PatchShareCallback })["m"] = ((wreq: WebpackRequire) => {
        webpackRequire = wreq;
        return patches;
    });
}
