export type ChunkId = number | string | Symbol;
export type WebpackChunk = [[ChunkId], Record<number, ModuleFactory>, Function?];
export type WebpackGlobal = Array<unknown>;

export type ModuleExports = any;

export type Module = {
    id: PropertyKey;
    loaded: boolean;
    exports: ModuleExports;
};

/** exports can be anything, however initially it is always an empty object */
export type ModuleFactory = (this: ModuleExports, module: Module, exports: ModuleExports, require: WebpackRequire) => void;

export type OnChunksLoaded = ((this: WebpackRequire, result: any, chunkIds: PropertyKey[] | undefined | null, callback: () => any, priority: number) => any) & {
    /** Check if a chunk has been loaded */
    j: (this: OnChunksLoaded, chunkId: PropertyKey) => boolean;
};

export type WebpackRequire = ((moduleId: PropertyKey) => ModuleExports) & {
    /** The module factories, where all modules that have been loaded are stored (pre-loaded or loaded by lazy chunks) */
    m: Record<PropertyKey, ModuleFactory>;
    /** getDefaultExport function for compatibility with non-harmony modules */
    n: (this: WebpackRequire, exports: any) => () => ModuleExports;
    /**
     * Define getter functions for harmony exports. For every prop in "definiton" (the module exports), set a getter in "exports" for the getter function in the "definition", like this:
     * @example
     * const exports = {};
     * const definition = { exportName: () => someExportedValue };
     * for (const key in definition) {
     *     if (Object.hasOwn(definition, key) && !Object.hasOwn(exports, key)) {
     *         Object.defineProperty(exports, key, {
     *             get: definition[key],
     *             enumerable: true
     *         });
     *     }
     * }
     * // exports is now { exportName: someExportedValue } (but each value is actually a getter)
     */
    d: (this: WebpackRequire, exports: Record<PropertyKey, any>, definiton: Record<PropertyKey, () => ModuleExports>) => void;
    /** Shorthand for Object.prototype.hasOwnProperty */
    o: typeof Object.prototype.hasOwnProperty;
    /** Defines __esModule on the exports, marking ES Modules compatibility as true */
    r: (this: WebpackRequire, exports: ModuleExports) => void;
    /** Node.js module decorator. Decorates a module as a Node.js module */
    nmd: (this: WebpackRequire, module: Module) => any;
    /**
     * Register deferred code which will be executed when the passed chunks are loaded.
     *
     * If chunkIds is defined, it defers the execution of the callback and returns undefined.
     *
     * If chunkIds is undefined, and no deferred code exists or can be executed, it returns the value of the result argument.
     *
     * If chunkIds is undefined, and some deferred code can already be executed, it returns the result of the callback function of the last deferred code.
     *
     * When (priority & 1) it will wait for all other handlers with lower priority to be executed before itself is executed.
     */
    O: OnChunksLoaded;
    /** Bundle public path, where chunk files are stored. Used by other methods which load chunks to obtain the full asset url */
    p: string;
};
