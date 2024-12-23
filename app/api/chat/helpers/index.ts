export function serializeBigInts(obj: any): any {
    if (obj === null || obj === undefined) {
      return obj;
    }
  
    if (typeof obj === 'bigint') {
      return obj.toString();
    }
  
    if (Array.isArray(obj)) {
      return obj.map(item => serializeBigInts(item));
    }
  
    if (typeof obj === 'object') {
      const serialized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        serialized[key] = serializeBigInts(value);
      }
      return serialized;
    }
  
    return obj;
  }
  