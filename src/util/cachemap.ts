interface ICacheItem {
    content: any;
    meta: {
        createdAt: number;
        ttl: number;
    };
}

export enum Interval {
    SECOND = 10000,
    MINUTE = 60000,
    HOUR = 3600000,
    DAY = 86400000,
    WEEK = 604800000,
    MONTH = 2592000000,
    FOREVER = Infinity,
}

export class CacheMap {
    private _data: Map<string, ICacheItem> = new Map<string, ICacheItem>();

    public getItem<T>(key: string): T | undefined {
        const item = this._data.get(key);
        if (item && this.isItemExpired(item)) {
            this._data.delete(key);
            return undefined;
        }

        return item ? item.content : undefined;
    }

    public getItems<T>(): { key: string; value: T }[] {
        const found: { key: string; value: T }[] = [];

        this._data.forEach((item, key) => {
            if (item && !this.isItemExpired(item)) {
                found.push({ key: key, value: item.content });
            }
        });

        return found;
    }

    public setItem(key: string, content: any, ttl: number = Infinity) {
        const meta = {
            ttl: ttl,
            createdAt: Date.now(),
        };

        this._data.set(key, {
            content: content,
            meta: meta,
        });
    }

    public updateItem(key: string, content: any) {
        const item = this._data.get(key);

        if (item) {
            item.content = content;
            this._data.set(key, item);
        }
    }

    public deleteItem(key: string): boolean {
        return this._data.delete(key);
    }

    public clear() {
        this._data.clear();
    }

    private isItemExpired(item: ICacheItem): boolean {
        return Date.now() > item.meta.createdAt + item.meta.ttl;
    }
}
