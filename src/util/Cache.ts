interface CacheOptions {
    ttl: number;  // Time To Live per entry
    checkPeriod: number;  // how often the cache should be checked, in seconds
}

interface CacheEntry<V> {
    value: V;
    createdAt: Date;  // (unused)
    lastModified: Date;
}

export default class Cache<K, V> {
    private data: Map<K, CacheEntry<V>> = new Map();
    private options: CacheOptions;

    constructor(options: CacheOptions) {
        this.options = options;
        this.checkContents();
    }

    /**
     * Returns the cache entry at a particular key if it exists, undefined otherwise
     * @param key The key to return the cache entry of
     * @returns The CacheEntry object at the given key
     */
    getEntry(key: K): CacheEntry<V> | undefined {
        const entry = this.data.get(key);
        if(entry != undefined)
            return this.isValid(entry) ? entry : undefined;

        return undefined;
    }

    /**
     * Returns the value contained in the cache, or undefined if it doesn't exist or is expired
     * @param key The key to retrieve
     * @returns The value if found and not expired, undefined otherwise
     */
    get(key: K): V | undefined {
        return this.getEntry(key)?.value ?? undefined;
    }

    /**
     * Returns the value contained in the cache, or a default value if the said entry doesn't exist or has expired
     * @param key The key to retrieve
     * @param alt The default value to return if the value at the given key doesn't exist/has expired
     * @returns The value at the given key if found and not expired, the alternate value
     */
    getOrDefault(key: K, alt: V): V {
        return this.get(key) ?? alt;
    }

    /**
     * Sets a particular value at the given key.
     * Any existing entry will be discarded and replaced, with its lastModified attribute updated in addition to the value
     * @param key The key to set
     * @param value The value to set
     */
    set(key: K, value: V) {
        const now = new Date();

        const entryToSet = { value: value, createdAt: this.getEntry(key)?.createdAt ?? now, lastModified: now}

        this.data.set(key, entryToSet);
    }

    private isValid(entry: CacheEntry<V>): boolean {
        const now = new Date().getUTCSeconds();

        // check TTL
        return now >= entry.lastModified.getUTCSeconds()
    }

    private checkContents() {
        this.data.forEach((v, k) => {
            if(!this.isValid(v)) this.data.delete(k);
        });

        setTimeout(this.checkContents, this.options.checkPeriod * 1000);
    }
}
