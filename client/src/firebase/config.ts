/**
 * Firebase Config Mock Module
 * 
 * This file provides mock objects to satisfy Firebase config imports
 * without actually initializing Firebase, since we're migrating to MongoDB.
 */

// Only log Firebase environment variables for backward compatibility
console.log("Firebase environment variables available:", {
  apiKey: !!import.meta.env.VITE_FIREBASE_API_KEY,
  projectId: !!import.meta.env.VITE_FIREBASE_PROJECT_ID,
  messagingSenderId: !!import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: !!import.meta.env.VITE_FIREBASE_APP_ID,
  databaseURL: !!import.meta.env.VITE_FIREBASE_DATABASE_URL,
});

// Create empty provider factory
const providerFactory = {
  getImmediate: () => null,
  get: () => null,
  initialize: () => null
};

// Create a complete Firebase app mock with all necessary properties
// Using type 'any' to bypass TypeScript restrictions for our mock
const app: any = {
  name: "MongoDB-Migration",
  options: {},
  automaticDataCollectionEnabled: false,
  
  // Add Firebase internal methods
  getProvider: () => providerFactory,
  _getService: () => ({}),
  _components: new Map(),
  _instancesDeferred: new Map(),
  _instances: new Map(),
  
  // Firebase 9+ compatibility
  _delegate: {
    app: {},
    name: "MongoDB-Migration",
    options: {},
    settings: { appVerificationDisabledForTesting: false },
    container: {},
    INTERNAL: { getToken: async () => ({}) }
  }
};

// Add circular references required by Firebase
app.container = app;
app._delegate.container = app.container;
app._delegate.app = app;

// Comprehensive mock for auth with all commonly used properties
const auth: any = {
  currentUser: null,
  onAuthStateChanged: (callback: (user: null) => void) => {
    // Immediately call with null to indicate not authenticated
    setTimeout(() => callback(null), 0);
    // Return unsubscribe function
    return () => {};
  },
  onIdTokenChanged: (callback: (user: null) => void) => {
    setTimeout(() => callback(null), 0);
    return () => {};
  },
  signOut: async () => Promise.resolve(),
  signInWithEmailAndPassword: async () => {
    throw new Error("Firebase auth is disabled - using MongoDB authentication");
  },
  createUserWithEmailAndPassword: async () => {
    throw new Error("Firebase auth is disabled - using MongoDB authentication");
  },
  signInWithPopup: async () => {
    throw new Error("Firebase auth is disabled - using MongoDB authentication");
  },
  signInWithRedirect: async () => {
    throw new Error("Firebase auth is disabled - using MongoDB authentication");
  },
  
  // Additional auth properties
  languageCode: "en",
  tenantId: null,
  useDeviceLanguage: () => {},
  settings: { appVerificationDisabledForTesting: false },
  app: app,
  _delegate: { app },
  setPersistence: async () => Promise.resolve(),
  
  // Auth providers 
  GoogleAuthProvider: class {
    static credential() { return {}; }
    addScope() { return this; }
  },
  GithubAuthProvider: class {
    static credential() { return {}; }
    addScope() { return this; }
  },
  TwitterAuthProvider: class {
    static credential() { return {}; }
  },
  FacebookAuthProvider: class {
    static credential() { return {}; }
    addScope() { return this; }
  }
};

// Mock for firestore with nested stubs for all common methods
const firestore: any = {
  collection: (path: string) => ({
    doc: (id: string) => ({
      id,
      path: `${path}/${id}`,
      get: async () => ({
        exists: false,
        id,
        data: () => null,
        ref: { path: `${path}/${id}` }
      }),
      set: async () => Promise.resolve(),
      update: async () => Promise.resolve(),
      delete: async () => Promise.resolve(),
      onSnapshot: (callback: Function) => {
        callback({
          exists: false,
          id,
          data: () => null,
          ref: { path: `${path}/${id}` }
        });
        return () => {};
      }
    }),
    where: () => ({
      get: async () => ({ 
        empty: true, 
        docs: [], 
        forEach: () => {} 
      }),
      onSnapshot: (callback: Function) => {
        callback({ 
          empty: true, 
          docs: [],
          forEach: () => {} 
        });
        return () => {};
      }
    }),
    orderBy: () => ({
      limit: () => ({
        get: async () => ({ 
          empty: true, 
          docs: [],
          forEach: () => {} 
        })
      }),
      get: async () => ({ 
        empty: true, 
        docs: [],
        forEach: () => {} 
      })
    }),
    limit: () => ({
      get: async () => ({ 
        empty: true, 
        docs: [],
        forEach: () => {} 
      })
    }),
    add: async () => ({ 
      id: "mock-doc-id", 
      path: `${path}/mock-doc-id` 
    }),
    get: async () => ({ 
      empty: true, 
      docs: [],
      forEach: () => {} 
    }),
    onSnapshot: (callback: Function) => {
      callback({ 
        empty: true, 
        docs: [],
        forEach: () => {} 
      });
      return () => {};
    }
  }),
  doc: (path: string) => ({
    path,
    get: async () => ({
      exists: false,
      data: () => null,
      ref: { path }
    }),
    set: async () => Promise.resolve(),
    update: async () => Promise.resolve(),
    delete: async () => Promise.resolve(),
    onSnapshot: (callback: Function) => {
      callback({
        exists: false,
        data: () => null,
        ref: { path }
      });
      return () => {};
    }
  }),
  batch: () => ({
    set: () => {},
    update: () => {},
    delete: () => {},
    commit: async () => Promise.resolve()
  }),
  runTransaction: async (callback: Function) => {
    return await callback({ 
      get: async () => ({ exists: false, data: () => null }),
      set: async () => {},
      update: async () => {},
      delete: async () => {}
    });
  },
  app: app,
  _delegate: { app }
};

// Mock for storage with common methods
const storage: any = {
  ref: (path: string = '') => ({
    fullPath: path,
    bucket: "mock-bucket",
    name: path.split('/').pop() || '',
    parent: path.includes('/') ? storage.ref(path.split('/').slice(0, -1).join('/')) : null,
    root: storage.ref(),
    child: (childPath: string) => storage.ref(`${path}/${childPath}`),
    put: async () => ({
      ref: storage.ref(path),
      metadata: { fullPath: path },
      snapshot: { ref: storage.ref(path) },
      downloadURL: `https://example.com/mock-file-url/${path}`
    }),
    putString: async () => ({
      ref: storage.ref(path),
      metadata: { fullPath: path }
    }),
    delete: async () => Promise.resolve(),
    getDownloadURL: async () => `https://example.com/mock-file-url/${path}`,
    listAll: async () => ({
      items: [],
      prefixes: []
    }),
    getMetadata: async () => ({
      name: path.split('/').pop() || '',
      fullPath: path,
      size: 0,
      contentType: 'application/octet-stream',
      customMetadata: {}
    })
  }),
  app: app,
  _delegate: { app }
};

// Mock for Realtime database with common methods
const database: any = {
  ref: (path: string = '') => ({
    path,
    key: path.split('/').pop() || null,
    parent: path.includes('/') ? database.ref(path.split('/').slice(0, -1).join('/')) : null,
    root: database.ref(),
    child: (childPath: string) => database.ref(`${path}/${childPath}`),
    push: () => {
      const newId = 'mock-push-id-' + Math.random().toString(36).substring(2, 15);
      return database.ref(`${path}/${newId}`);
    },
    set: async () => Promise.resolve(),
    update: async () => Promise.resolve(),
    remove: async () => Promise.resolve(),
    onValue: (callback: Function) => {
      callback({
        exists: () => false,
        val: () => null,
        forEach: () => false
      });
      return () => {};
    },
    once: async () => ({
      exists: () => false,
      val: () => null,
      forEach: () => false
    }),
    get: async () => ({
      exists: () => false,
      val: () => null,
      forEach: () => false
    }),
    orderByChild: () => ({
      equalTo: () => ({
        once: async () => ({
          exists: () => false,
          val: () => null,
          forEach: () => false
        })
      }),
      startAt: () => ({
        endAt: () => ({
          once: async () => ({
            exists: () => false,
            val: () => null,
            forEach: () => false
          })
        })
      })
    }),
    orderByKey: () => ({
      once: async () => ({
        exists: () => false,
        val: () => null,
        forEach: () => false
      })
    })
  }),
  app: app,
  _delegate: { app },
  ServerValue: {
    TIMESTAMP: { '.sv': 'timestamp' }
  }
};

// Log that Firebase Auth persistence would be set
console.log("Firebase Auth persistence set to LOCAL");

// Export mock Firebase services
export { auth, firestore, storage, database, app };
