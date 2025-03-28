import { DateTimeMocker } from '../../testsutil';
import { CacheMap } from './cachemap';

describe('CacheMap', () => {
    beforeAll(() => {
        DateTimeMocker.initialize();
    });

    it('should set and get an item', () => {
        const cache = new CacheMap();
        cache.setItem('key1', 'value1', 1000);
        const result = cache.getItem<string>('key1');
        expect(result).toBe('value1');
    });

    it('should return undefined for expired items', () => {
        const cache = new CacheMap();

        cache.setItem('key1', 'value1', 1); // 1ms TTL
        DateTimeMocker.advanceTime(2);

        const result = cache.getItem<string>('key1');
        expect(result).toBeUndefined();
    });

    it('should delete an item', () => {
        const cache = new CacheMap();
        cache.setItem('key1', 'value1');
        const deleted = cache.deleteItem('key1');
        expect(deleted).toBe(true);
        const result = cache.getItem<string>('key1');
        expect(result).toBeUndefined();
    });

    it('should clear all items', () => {
        const cache = new CacheMap();
        cache.setItem('key1', 'value1');
        cache.setItem('key2', 'value2');
        cache.clear();
        expect(cache.getItem<string>('key1')).toBeUndefined();
        expect(cache.getItem<string>('key2')).toBeUndefined();
    });

    it('should update an existing item', () => {
        const cache = new CacheMap();
        cache.setItem('key1', 'value1');
        cache.updateItem('key1', 'updatedValue');
        const result = cache.getItem<string>('key1');
        expect(result).toBe('updatedValue');
    });

    it('should not update a non-existing item', () => {
        const cache = new CacheMap();
        cache.updateItem('key1', 'value1');
        const result = cache.getItem<string>('key1');
        expect(result).toBeUndefined();
    });

    it('should retrieve all non-expired items', () => {
        const cache = new CacheMap();
        cache.setItem('key1', 'value1', 1000);
        cache.setItem('key2', 'value2', 1); // Expired
        DateTimeMocker.advanceTime(2);
        cache.setItem('key3', 'value3', 1000);

        const items = cache.getItems<string>();
        expect(items).toHaveLength(2);
        expect(items).toEqual([
            { key: 'key1', value: 'value1' },
            { key: 'key3', value: 'value3' },
        ]);
    });
});
