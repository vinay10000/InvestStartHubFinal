/**
 * MongoDB-compatible Firebase Realtime Database API
 * 
 * This module provides a simplified API that mimics the Firebase Realtime Database API
 * but uses MongoDB in the background. This helps maintain compatibility
 * with existing code while transitioning away from Firebase.
 */

import { apiRequest } from "@/lib/queryClient";

// Reference to a location in the MongoDB database
export interface Reference {
  key: string | null;
  path: string;
  parent: Reference | null;
  
  // Methods
  child: (path: string) => Reference;
  push: () => Reference;
  set: (value: any) => Promise<void>;
  update: (value: any) => Promise<void>;
  remove: () => Promise<void>;
  once: (eventType: string) => Promise<DataSnapshot>;
  on: (
    eventType: string, 
    callback: (snapshot: DataSnapshot) => void,
    cancelCallback?: (error: Error) => void
  ) => void;
  off: (eventType?: string, callback?: (snapshot: DataSnapshot) => void) => void;
  orderByChild: (path: string) => Query;
  orderByKey: () => Query;
  orderByValue: () => Query;
  limitToFirst: (limit: number) => Query;
  limitToLast: (limit: number) => Query;
  startAt: (value: any, key?: string) => Query;
  endAt: (value: any, key?: string) => Query;
  equalTo: (value: any, key?: string) => Query;
}

// Snapshot of data from a Reference
export interface DataSnapshot {
  key: string | null;
  val: () => any;
  exists: () => boolean;
  forEach: (callback: (childSnapshot: DataSnapshot) => boolean | void) => boolean;
  child: (path: string) => DataSnapshot;
}

// Query interface for filtering and ordering data
export interface Query {
  ref: Reference;
  once: (eventType: string) => Promise<DataSnapshot>;
  on: (
    eventType: string, 
    callback: (snapshot: DataSnapshot) => void,
    cancelCallback?: (error: Error) => void
  ) => void;
  off: (eventType?: string, callback?: (snapshot: DataSnapshot) => void) => void;
  orderByChild: (path: string) => Query;
  orderByKey: () => Query;
  orderByValue: () => Query;
  limitToFirst: (limit: number) => Query;
  limitToLast: (limit: number) => Query;
  startAt: (value: any, key?: string) => Query;
  endAt: (value: any, key?: string) => Query;
  equalTo: (value: any, key?: string) => Query;
}

// Active event listeners
const listeners: Map<string, Array<{
  eventType: string;
  callback: (snapshot: DataSnapshot) => void;
}>> = new Map();

// Create a DataSnapshot from data
function createDataSnapshot(key: string | null, data: any): DataSnapshot {
  return {
    key,
    val: () => data,
    exists: () => data !== null && data !== undefined,
    forEach: (callback: (childSnapshot: DataSnapshot) => boolean | void) => {
      if (!data || typeof data !== 'object') return false;
      
      let cancelIteration = false;
      Object.keys(data).some(childKey => {
        const childData = data[childKey];
        const childSnapshot = createDataSnapshot(childKey, childData);
        const result = callback(childSnapshot);
        if (result === true) {
          cancelIteration = true;
          return true;
        }
        return false;
      });
      
      return cancelIteration;
    },
    child: (path: string) => {
      if (!data) return createDataSnapshot(null, null);
      
      const pathParts = path.split('/').filter(Boolean);
      let currentData = data;
      
      for (const part of pathParts) {
        if (!currentData || typeof currentData !== 'object') {
          return createDataSnapshot(part, null);
        }
        currentData = currentData[part];
      }
      
      return createDataSnapshot(pathParts[pathParts.length - 1] || null, currentData);
    }
  };
}

// Clean and normalize a path
function normalizePath(path: string): string {
  return path.replace(/^\/?/, '').replace(/\/$/, '');
}

// Extract the collection name from a path
function getCollectionFromPath(path: string): string {
  const normalizedPath = normalizePath(path);
  const firstPart = normalizedPath.split('/')[0];
  return firstPart || '';
}

// Extract the document ID from a path
function getDocumentIdFromPath(path: string): string | null {
  const normalizedPath = normalizePath(path);
  const parts = normalizedPath.split('/');
  
  // If path has at least 2 parts, the second is the document ID
  if (parts.length >= 2) {
    return parts[1];
  }
  
  return null;
}

// MongoDB-compatible Reference implementation
function createReference(path: string, parent: Reference | null = null): Reference {
  const normalizedPath = normalizePath(path);
  const key = normalizedPath.split('/').pop() || null;
  
  // Create default query parameters
  const queryParams: {
    orderBy?: { field?: string, type: 'child' | 'key' | 'value' };
    limit?: { type: 'first' | 'last', value: number };
    range?: { 
      startAt?: { value: any, key?: string },
      endAt?: { value: any, key?: string },
      equalTo?: { value: any, key?: string }
    };
  } = {};
  
  // Create a query based on the reference and additional constraints
  function createQuery(newQueryParams: typeof queryParams): Query {
    const combinedParams = { ...queryParams, ...newQueryParams };
    
    const query: Query = {
      ref: ref,
      
      // Query data once
      async once(eventType: string): Promise<DataSnapshot> {
        try {
          // Build the URL with query parameters
          let url = `/api/mongodb/${getCollectionFromPath(normalizedPath)}`;
          const docId = getDocumentIdFromPath(normalizedPath);
          
          if (docId) {
            url += `/${docId}`;
          }
          
          // Add query parameters
          const params = new URLSearchParams();
          
          // Add ordering
          if (combinedParams.orderBy) {
            if (combinedParams.orderBy.type === 'child' && combinedParams.orderBy.field) {
              params.append('orderBy[0][field]', combinedParams.orderBy.field);
              params.append('orderBy[0][direction]', 'asc');
            } else if (combinedParams.orderBy.type === 'key') {
              params.append('orderBy[0][field]', '_id');
              params.append('orderBy[0][direction]', 'asc');
            } else if (combinedParams.orderBy.type === 'value') {
              params.append('orderBy[0][field]', 'value');
              params.append('orderBy[0][direction]', 'asc');
            }
          }
          
          // Add limits
          if (combinedParams.limit) {
            params.append('limit', String(combinedParams.limit.value));
            
            if (combinedParams.limit.type === 'last') {
              params.append('reverse', 'true');
            }
          }
          
          // Add range filters
          let filterIndex = 0;
          if (combinedParams.range) {
            if (combinedParams.range.equalTo) {
              const { value, key } = combinedParams.range.equalTo;
              const field = key || (combinedParams.orderBy?.field || '_id');
              
              params.append(`filter[${filterIndex}][field]`, field);
              params.append(`filter[${filterIndex}][op]`, '==');
              params.append(`filter[${filterIndex}][value]`, String(value));
              filterIndex++;
            } else {
              if (combinedParams.range.startAt) {
                const { value, key } = combinedParams.range.startAt;
                const field = key || (combinedParams.orderBy?.field || '_id');
                
                params.append(`filter[${filterIndex}][field]`, field);
                params.append(`filter[${filterIndex}][op]`, '>=');
                params.append(`filter[${filterIndex}][value]`, String(value));
                filterIndex++;
              }
              
              if (combinedParams.range.endAt) {
                const { value, key } = combinedParams.range.endAt;
                const field = key || (combinedParams.orderBy?.field || '_id');
                
                params.append(`filter[${filterIndex}][field]`, field);
                params.append(`filter[${filterIndex}][op]`, '<=');
                params.append(`filter[${filterIndex}][value]`, String(value));
                filterIndex++;
              }
            }
          }
          
          // Add path filters for deeper paths
          const pathParts = normalizedPath.split('/');
          if (pathParts.length > 2) {
            // Extract the sub-path beyond the collection and document
            const subPath = pathParts.slice(2).join('.');
            
            if (subPath) {
              params.append(`subPath`, subPath);
            }
          }
          
          // Add params to URL if we have any
          const queryString = params.toString();
          if (queryString) {
            url += `?${queryString}`;
          }
          
          const response = await apiRequest('GET', url);
          const data = await response.json();
          
          return createDataSnapshot(key, data);
        } catch (error) {
          console.error(`Error fetching data from MongoDB for path ${normalizedPath}:`, error);
          return createDataSnapshot(key, null);
        }
      },
      
      // Listen for real-time updates
      on(
        eventType: string, 
        callback: (snapshot: DataSnapshot) => void,
        cancelCallback?: (error: Error) => void
      ): void {
        // Store the listener
        const listenerId = normalizedPath + '_' + eventType;
        if (!listeners.has(listenerId)) {
          listeners.set(listenerId, []);
        }
        
        listeners.get(listenerId)?.push({ eventType, callback });
        
        // Immediately fetch initial data
        query.once(eventType).then(callback).catch(error => {
          if (cancelCallback) cancelCallback(error);
        });
        
        // Real-time updates would normally use WebSockets
        // For this adapter, we'll simply poll the API
        const pollInterval = setInterval(async () => {
          try {
            const snapshot = await query.once(eventType);
            callback(snapshot);
          } catch (error) {
            if (cancelCallback) cancelCallback(error as Error);
          }
        }, 5000); // Poll every 5 seconds
        
        // Store the interval for cleanup
        const intervalKey = normalizedPath + '_interval_' + eventType;
        (window as any)[intervalKey] = pollInterval;
      },
      
      // Remove event listeners
      off(eventType?: string, callback?: (snapshot: DataSnapshot) => void): void {
        if (!eventType) {
          // Remove all listeners for this reference
          Object.keys(listeners.keys()).forEach(key => {
            if (key.startsWith(normalizedPath + '_')) {
              listeners.delete(key);
              
              // Clear any polling intervals
              const intervalKey = key.replace('_', '_interval_');
              if ((window as any)[intervalKey]) {
                clearInterval((window as any)[intervalKey]);
                delete (window as any)[intervalKey];
              }
            }
          });
        } else {
          const listenerId = normalizedPath + '_' + eventType;
          
          if (callback) {
            // Remove specific callback
            const currentListeners = listeners.get(listenerId);
            if (currentListeners) {
              const updatedListeners = currentListeners.filter(
                listener => listener.callback !== callback
              );
              
              if (updatedListeners.length === 0) {
                listeners.delete(listenerId);
                
                // Clear any polling intervals
                const intervalKey = normalizedPath + '_interval_' + eventType;
                if ((window as any)[intervalKey]) {
                  clearInterval((window as any)[intervalKey]);
                  delete (window as any)[intervalKey];
                }
              } else {
                listeners.set(listenerId, updatedListeners);
              }
            }
          } else {
            // Remove all listeners for this event type
            listeners.delete(listenerId);
            
            // Clear any polling intervals
            const intervalKey = normalizedPath + '_interval_' + eventType;
            if ((window as any)[intervalKey]) {
              clearInterval((window as any)[intervalKey]);
              delete (window as any)[intervalKey];
            }
          }
        }
      },
      
      // Query modifiers
      orderByChild(path: string): Query {
        return createQuery({
          ...combinedParams,
          orderBy: { field: path, type: 'child' }
        });
      },
      
      orderByKey(): Query {
        return createQuery({
          ...combinedParams,
          orderBy: { type: 'key' }
        });
      },
      
      orderByValue(): Query {
        return createQuery({
          ...combinedParams,
          orderBy: { type: 'value' }
        });
      },
      
      limitToFirst(limit: number): Query {
        return createQuery({
          ...combinedParams,
          limit: { type: 'first', value: limit }
        });
      },
      
      limitToLast(limit: number): Query {
        return createQuery({
          ...combinedParams,
          limit: { type: 'last', value: limit }
        });
      },
      
      startAt(value: any, key?: string): Query {
        return createQuery({
          ...combinedParams,
          range: {
            ...combinedParams.range,
            startAt: { value, key }
          }
        });
      },
      
      endAt(value: any, key?: string): Query {
        return createQuery({
          ...combinedParams,
          range: {
            ...combinedParams.range,
            endAt: { value, key }
          }
        });
      },
      
      equalTo(value: any, key?: string): Query {
        return createQuery({
          ...combinedParams,
          range: {
            ...combinedParams.range,
            equalTo: { value, key }
          }
        });
      }
    };
    
    return query;
  }
  
  // Create the reference object
  const ref: Reference = {
    key,
    path: normalizedPath,
    parent,
    
    // Create a reference to a child location
    child(childPath: string): Reference {
      const combinedPath = normalizedPath ? `${normalizedPath}/${childPath}` : childPath;
      return createReference(combinedPath, ref);
    },
    
    // Create a reference with a unique key
    push(): Reference {
      const uniqueId = Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
      return ref.child(uniqueId);
    },
    
    // Write data to the reference
    async set(value: any): Promise<void> {
      try {
        const collection = getCollectionFromPath(normalizedPath);
        const docId = getDocumentIdFromPath(normalizedPath);
        
        if (!collection) {
          throw new Error('Invalid path: collection name is required');
        }
        
        if (!docId) {
          throw new Error('Invalid path: document ID is required for set operation');
        }
        
        // Check if we need to update a nested field
        const pathParts = normalizedPath.split('/');
        
        if (pathParts.length > 2) {
          // We need to update a nested field
          // First, get the current document
          const response = await apiRequest('GET', `/api/mongodb/${collection}/${docId}`);
          
          if (!response.ok && response.status !== 404) {
            throw new Error(`Failed to get document: ${response.statusText}`);
          }
          
          // Create or update the document with the nested field
          let document = {};
          
          if (response.ok) {
            try {
              document = await response.json();
            } catch (e) {
              // Document doesn't exist yet or is empty
            }
          }
          
          // Build the path to the nested field
          const fieldPath = pathParts.slice(2);
          
          // Update the nested field
          let current = document;
          for (let i = 0; i < fieldPath.length - 1; i++) {
            const part = fieldPath[i];
            if (!current[part] || typeof current[part] !== 'object') {
              current[part] = {};
            }
            current = current[part];
          }
          
          // Set the value at the final path
          current[fieldPath[fieldPath.length - 1]] = value;
          
          // Update the document
          await apiRequest('PUT', `/api/mongodb/${collection}/${docId}`, document);
        } else {
          // Simple document set
          await apiRequest('PUT', `/api/mongodb/${collection}/${docId}`, value);
        }
      } catch (error) {
        console.error(`Error setting data in MongoDB for path ${normalizedPath}:`, error);
        throw error;
      }
    },
    
    // Update specific fields at the reference
    async update(value: any): Promise<void> {
      try {
        const collection = getCollectionFromPath(normalizedPath);
        const docId = getDocumentIdFromPath(normalizedPath);
        
        if (!collection) {
          throw new Error('Invalid path: collection name is required');
        }
        
        if (!docId) {
          throw new Error('Invalid path: document ID is required for update operation');
        }
        
        // Check if we need to update a nested field
        const pathParts = normalizedPath.split('/');
        
        if (pathParts.length > 2) {
          // We need to update a nested field
          // First, get the current document
          const response = await apiRequest('GET', `/api/mongodb/${collection}/${docId}`);
          
          if (!response.ok && response.status !== 404) {
            throw new Error(`Failed to get document: ${response.statusText}`);
          }
          
          // Create or update the document with the nested field
          let document = {};
          
          if (response.ok) {
            try {
              document = await response.json();
            } catch (e) {
              // Document doesn't exist yet or is empty
            }
          }
          
          // Build the path to the nested field
          const fieldPath = pathParts.slice(2);
          const nestedPath = fieldPath.join('.');
          
          // Create the update with the nested field path
          const update = {};
          
          for (const [key, val] of Object.entries(value)) {
            update[`${nestedPath}.${key}`] = val;
          }
          
          // Update the document
          await apiRequest('PATCH', `/api/mongodb/${collection}/${docId}`, update);
        } else {
          // Simple document update
          await apiRequest('PATCH', `/api/mongodb/${collection}/${docId}`, value);
        }
      } catch (error) {
        console.error(`Error updating data in MongoDB for path ${normalizedPath}:`, error);
        throw error;
      }
    },
    
    // Remove the data at the reference
    async remove(): Promise<void> {
      try {
        const collection = getCollectionFromPath(normalizedPath);
        const docId = getDocumentIdFromPath(normalizedPath);
        
        if (!collection) {
          throw new Error('Invalid path: collection name is required');
        }
        
        if (!docId) {
          throw new Error('Invalid path: document ID is required for remove operation');
        }
        
        // Check if we need to remove a nested field
        const pathParts = normalizedPath.split('/');
        
        if (pathParts.length > 2) {
          // We need to remove a nested field
          // First, get the current document
          const response = await apiRequest('GET', `/api/mongodb/${collection}/${docId}`);
          
          if (!response.ok) {
            if (response.status === 404) {
              // Document doesn't exist, nothing to remove
              return;
            }
            throw new Error(`Failed to get document: ${response.statusText}`);
          }
          
          // Get the document
          const document = await response.json();
          
          // Build the path to the nested field
          const fieldPath = pathParts.slice(2);
          
          // Check if the field exists
          let current = document;
          for (let i = 0; i < fieldPath.length - 1; i++) {
            const part = fieldPath[i];
            if (!current[part] || typeof current[part] !== 'object') {
              // Field doesn't exist, nothing to remove
              return;
            }
            current = current[part];
          }
          
          // Remove the field
          delete current[fieldPath[fieldPath.length - 1]];
          
          // Update the document
          await apiRequest('PUT', `/api/mongodb/${collection}/${docId}`, document);
        } else {
          // Remove the entire document
          await apiRequest('DELETE', `/api/mongodb/${collection}/${docId}`);
        }
      } catch (error) {
        console.error(`Error removing data from MongoDB for path ${normalizedPath}:`, error);
        throw error;
      }
    },
    
    // Get data once
    async once(eventType: string): Promise<DataSnapshot> {
      try {
        const collection = getCollectionFromPath(normalizedPath);
        
        if (!collection) {
          return createDataSnapshot(key, null);
        }
        
        const docId = getDocumentIdFromPath(normalizedPath);
        
        if (docId) {
          // Get a specific document
          const response = await apiRequest('GET', `/api/mongodb/${collection}/${docId}`);
          
          if (!response.ok) {
            if (response.status === 404) {
              return createDataSnapshot(key, null);
            }
            throw new Error(`Failed to get document: ${response.statusText}`);
          }
          
          const data = await response.json();
          
          // Check if we need to get a nested field
          const pathParts = normalizedPath.split('/');
          
          if (pathParts.length > 2) {
            // We need to get a nested field
            const fieldPath = pathParts.slice(2);
            
            // Navigate to the nested field
            let current = data;
            for (const part of fieldPath) {
              if (!current || typeof current !== 'object') {
                return createDataSnapshot(key, null);
              }
              current = current[part];
            }
            
            return createDataSnapshot(key, current);
          }
          
          return createDataSnapshot(key, data);
        } else {
          // Get all documents in the collection
          const response = await apiRequest('GET', `/api/mongodb/${collection}`);
          
          if (!response.ok) {
            throw new Error(`Failed to get collection: ${response.statusText}`);
          }
          
          const data = await response.json();
          
          // Convert array to object with IDs as keys to match Firebase behavior
          const result = data.reduce((acc: any, item: any) => {
            const itemId = item._id || item.id;
            if (itemId) {
              acc[itemId] = item;
            }
            return acc;
          }, {});
          
          return createDataSnapshot(key, result);
        }
      } catch (error) {
        console.error(`Error fetching data from MongoDB for path ${normalizedPath}:`, error);
        return createDataSnapshot(key, null);
      }
    },
    
    // Listen for real-time updates
    on(
      eventType: string, 
      callback: (snapshot: DataSnapshot) => void,
      cancelCallback?: (error: Error) => void
    ): void {
      // Create a query and use its on method
      createQuery({}).on(eventType, callback, cancelCallback);
    },
    
    // Remove event listeners
    off(eventType?: string, callback?: (snapshot: DataSnapshot) => void): void {
      // Create a query and use its off method
      createQuery({}).off(eventType, callback);
    },
    
    // Query modifiers
    orderByChild(path: string): Query {
      return createQuery({
        orderBy: { field: path, type: 'child' }
      });
    },
    
    orderByKey(): Query {
      return createQuery({
        orderBy: { type: 'key' }
      });
    },
    
    orderByValue(): Query {
      return createQuery({
        orderBy: { type: 'value' }
      });
    },
    
    limitToFirst(limit: number): Query {
      return createQuery({
        limit: { type: 'first', value: limit }
      });
    },
    
    limitToLast(limit: number): Query {
      return createQuery({
        limit: { type: 'last', value: limit }
      });
    },
    
    startAt(value: any, key?: string): Query {
      return createQuery({
        range: {
          startAt: { value, key }
        }
      });
    },
    
    endAt(value: any, key?: string): Query {
      return createQuery({
        range: {
          endAt: { value, key }
        }
      });
    },
    
    equalTo(value: any, key?: string): Query {
      return createQuery({
        range: {
          equalTo: { value, key }
        }
      });
    }
  };
  
  return ref;
}

// Create MongoDB database reference
export const database = {
  ref: (path: string = ''): Reference => createReference(path)
};

// Export some common Firebase types
export const ServerValue = {
  TIMESTAMP: { '.sv': 'timestamp' }
};

export default database;