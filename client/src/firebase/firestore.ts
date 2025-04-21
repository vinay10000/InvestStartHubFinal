/**
 * MongoDB-compatible Firestore API
 * 
 * This module provides a simplified API that mimics the Firestore API
 * but uses MongoDB in the background. This helps maintain compatibility
 * with existing code while transitioning away from Firebase.
 */

import { v4 as uuidv4 } from 'uuid';
import { apiRequest } from '@/lib/queryClient';

// Type definitions to match Firestore API
export interface DocumentReference {
  id: string;
  path: string;
  collection: (collectionPath: string) => CollectionReference;
  get: () => Promise<DocumentSnapshot>;
  set: (data: any, options?: any) => Promise<void>;
  update: (data: any) => Promise<void>;
  delete: () => Promise<void>;
}

export interface DocumentSnapshot {
  id: string;
  exists: boolean;
  data: () => any | null;
  ref: DocumentReference;
}

export interface CollectionReference {
  id: string;
  path: string;
  doc: (docId?: string) => DocumentReference;
  add: (data: any) => Promise<DocumentReference>;
  where: (field: string, op: string, value: any) => Query;
  orderBy: (field: string, direction?: 'asc' | 'desc') => Query;
  limit: (limit: number) => Query;
}

export interface Query {
  get: () => Promise<QuerySnapshot>;
  where: (field: string, op: string, value: any) => Query;
  orderBy: (field: string, direction?: 'asc' | 'desc') => Query;
  limit: (limit: number) => Query;
}

export interface QuerySnapshot {
  docs: DocumentSnapshot[];
  empty: boolean;
  size: number;
}

// Mock of Firestore instance
export const firestore = {
  collection: (collectionPath: string): CollectionReference => createCollection(collectionPath)
};

// Helper function to create a timestamp for consistency with Firestore
export const serverTimestamp = () => new Date();

// Helper function to create a collection reference
function createCollection(collectionPath: string): CollectionReference {
  return {
    id: collectionPath.split('/').pop() || '',
    path: collectionPath,
    
    // Create a document reference
    doc(docId?: string): DocumentReference {
      const id = docId || uuidv4();
      const path = `${collectionPath}/${id}`;
      
      return {
        id,
        path,
        
        // Create subcollections within documents
        collection(subCollectionPath: string): CollectionReference {
          return createCollection(`${path}/${subCollectionPath}`);
        },
        
        // Get a document from MongoDB
        async get(): Promise<DocumentSnapshot> {
          try {
            const response = await apiRequest('GET', `/api/mongodb/${collectionPath}/${id}`);
            const data = await response.json();
            
            return {
              id,
              exists: !!data,
              data: () => data || null,
              ref: this
            };
          } catch (error) {
            console.error(`Error getting document ${path}:`, error);
            return {
              id,
              exists: false,
              data: () => null,
              ref: this
            };
          }
        },
        
        // Create or update a document in MongoDB
        async set(data: any, options?: any): Promise<void> {
          try {
            const method = options?.merge ? 'PATCH' : 'PUT';
            await apiRequest(method, `/api/mongodb/${collectionPath}/${id}`, {
              ...data,
              _updatedAt: new Date()
            });
          } catch (error) {
            console.error(`Error setting document ${path}:`, error);
            throw error;
          }
        },
        
        // Update specific fields in a document
        async update(data: any): Promise<void> {
          try {
            await apiRequest('PATCH', `/api/mongodb/${collectionPath}/${id}`, {
              ...data,
              _updatedAt: new Date()
            });
          } catch (error) {
            console.error(`Error updating document ${path}:`, error);
            throw error;
          }
        },
        
        // Delete a document
        async delete(): Promise<void> {
          try {
            await apiRequest('DELETE', `/api/mongodb/${collectionPath}/${id}`);
          } catch (error) {
            console.error(`Error deleting document ${path}:`, error);
            throw error;
          }
        }
      };
    },
    
    // Add a new document with auto-generated ID
    async add(data: any): Promise<DocumentReference> {
      const docRef = this.doc();
      await docRef.set({
        ...data,
        _createdAt: new Date(),
        _updatedAt: new Date()
      });
      return docRef;
    },
    
    // Create a query with where clause
    where(field: string, op: string, value: any): Query {
      return createQuery(this.path, [{ field, op, value }]);
    },
    
    // Create a query with orderBy
    orderBy(field: string, direction: 'asc' | 'desc' = 'asc'): Query {
      return createQuery(this.path, [], [{ field, direction }]);
    },
    
    // Create a query with limit
    limit(limit: number): Query {
      return createQuery(this.path, [], [], limit);
    }
  };
}

// Helper function to create a query
function createQuery(
  collectionPath: string, 
  filters: Array<{ field: string, op: string, value: any }> = [],
  orderBys: Array<{ field: string, direction: 'asc' | 'desc' }> = [],
  limitCount?: number
): Query {
  return {
    // Execute the query
    async get(): Promise<QuerySnapshot> {
      try {
        // Build query parameters
        const params = new URLSearchParams();
        
        // Add filters
        filters.forEach((filter, index) => {
          params.append(`filter[${index}][field]`, filter.field);
          params.append(`filter[${index}][op]`, filter.op);
          params.append(`filter[${index}][value]`, String(filter.value));
        });
        
        // Add orderBy
        orderBys.forEach((orderBy, index) => {
          params.append(`orderBy[${index}][field]`, orderBy.field);
          params.append(`orderBy[${index}][direction]`, orderBy.direction);
        });
        
        // Add limit
        if (limitCount !== undefined) {
          params.append('limit', String(limitCount));
        }
        
        // Execute the request
        const response = await apiRequest('GET', `/api/mongodb/${collectionPath}?${params.toString()}`);
        const documents = await response.json();
        
        // Create document snapshots
        const docs = documents.map((doc: any) => ({
          id: doc._id || doc.id,
          exists: true,
          data: () => doc,
          ref: {
            id: doc._id || doc.id,
            path: `${collectionPath}/${doc._id || doc.id}`,
            // Add stub implementations for other DocumentReference methods
            collection: () => ({ /* stub */ }) as any,
            get: () => Promise.resolve({ /* stub */ }) as any,
            set: () => Promise.resolve() as any,
            update: () => Promise.resolve() as any,
            delete: () => Promise.resolve() as any
          }
        }));
        
        return {
          docs,
          empty: docs.length === 0,
          size: docs.length
        };
      } catch (error) {
        console.error(`Error executing query on ${collectionPath}:`, error);
        return {
          docs: [],
          empty: true,
          size: 0
        };
      }
    },
    
    // Add a where clause to the query
    where(field: string, op: string, value: any): Query {
      return createQuery(
        collectionPath,
        [...filters, { field, op, value }],
        orderBys,
        limitCount
      );
    },
    
    // Add an orderBy clause to the query
    orderBy(field: string, direction: 'asc' | 'desc' = 'asc'): Query {
      return createQuery(
        collectionPath,
        filters,
        [...orderBys, { field, direction }],
        limitCount
      );
    },
    
    // Add a limit to the query
    limit(limit: number): Query {
      return createQuery(
        collectionPath,
        filters,
        orderBys,
        limit
      );
    }
  };
}

// Convenience functions for compatibility with Firestore API
export function doc(collectionPath: string, docId: string): DocumentReference {
  return firestore.collection(collectionPath).doc(docId);
}

export function collection(path: string): CollectionReference {
  return firestore.collection(path);
}

export function setDoc(docRef: DocumentReference, data: any, options?: any): Promise<void> {
  return docRef.set(data, options);
}

export function addDoc(collectionRef: CollectionReference, data: any): Promise<DocumentReference> {
  return collectionRef.add(data);
}

export default firestore;