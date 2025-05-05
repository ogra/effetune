/**
 * Data storage utility for measurement data
 * Manages saving/loading from IndexedDB and file export/import
 */

class DataStorage {
    constructor() {
        this.STORAGE_KEY = 'frequency_response_measurements';
        this.DO_NOT_WARN_KEY = 'do_not_warn_on_delete';
        this.USER_SETTINGS_KEY = 'user_settings';
        this.PEQ_SETTINGS_KEY = 'peq_settings';
        this.DB_NAME = 'frequencyResponseDB';
        this.DB_VERSION = 1;
        this.STORE_NAME = 'measurements';
        this.SETTINGS_STORE = 'settings';
        this.db = null;
        this.measurements = [];
        this.loaded = false;
        
        // Event names for data changes
        this.EVENTS = {
            MEASUREMENT_ADDED: 'measurement-added',
            MEASUREMENT_UPDATED: 'measurement-updated',
            MEASUREMENT_DELETED: 'measurement-deleted',
            MEASUREMENTS_LOADED: 'measurements-loaded'
        };
    }

    /**
     * Initialize the data storage
     */
    async initialize() {
        if (this.loaded) return;
        
        try {
            await this.openDatabase();
            await this.loadMeasurements();
            this.loaded = true;
        } catch (error) {
            console.error('Error initializing database:', error);
            // Fallback to localStorage if IndexedDB fails
            this.loadFromLocalStorage();
            this.loaded = true;
        }
    }

    /**
     * Open and initialize the IndexedDB database
     * @returns {Promise} Promise that resolves when DB is ready
     */
    openDatabase() {
        return new Promise((resolve, reject) => {
            if (this.db) {
                resolve(this.db);
                return;
            }

            if (!window.indexedDB) {
                reject(new Error('Your browser does not support IndexedDB'));
                return;
            }

            const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

            request.onerror = (event) => {
                console.error('IndexedDB error:', event.target.error);
                reject(event.target.error);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Create measurements store with id as key path
                if (!db.objectStoreNames.contains(this.STORE_NAME)) {
                    const store = db.createObjectStore(this.STORE_NAME, { keyPath: 'id' });
                    store.createIndex('timestamp', 'timestamp', { unique: false });
                }
                
                // Create settings store
                if (!db.objectStoreNames.contains(this.SETTINGS_STORE)) {
                    db.createObjectStore(this.SETTINGS_STORE, { keyPath: 'key' });
                }
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                
                // Migrate data from localStorage if needed
                this.migrateFromLocalStorage().then(() => {
                    resolve(this.db);
                }).catch(err => {
                    console.error('Migration error:', err);
                    resolve(this.db); // Still resolve even if migration fails
                });
            };
        });
    }

    /**
     * Migrate data from localStorage to IndexedDB if needed
     */
    async migrateFromLocalStorage() {
        try {
            // Check if we already migrated
            const migrationDone = localStorage.getItem('indexeddb_migration_complete');
            if (migrationDone === 'true') {
                return;
            }

            // Check if there's data to migrate
            const storedData = localStorage.getItem(this.STORAGE_KEY);
            if (!storedData) {
                localStorage.setItem('indexeddb_migration_complete', 'true');
                return;
            }

            const measurements = JSON.parse(storedData);
            
            if (Array.isArray(measurements) && measurements.length > 0) {
                const transaction = this.db.transaction([this.STORE_NAME], 'readwrite');
                const store = transaction.objectStore(this.STORE_NAME);
                
                // Add each measurement to the store
                for (const measurement of measurements) {
                    store.put(measurement);
                }
                
                // Migrate the "do not warn" setting
                const doNotWarn = localStorage.getItem(this.DO_NOT_WARN_KEY) === 'true';
                const settingsTransaction = this.db.transaction([this.SETTINGS_STORE], 'readwrite');
                const settingsStore = settingsTransaction.objectStore(this.SETTINGS_STORE);
                settingsStore.put({ key: this.DO_NOT_WARN_KEY, value: doNotWarn });
                
                return new Promise((resolve, reject) => {
                    transaction.oncomplete = () => {
                        localStorage.setItem('indexeddb_migration_complete', 'true');
                        resolve();
                    };
                    transaction.onerror = (event) => {
                        console.error('Migration failed:', event.target.error);
                        reject(event.target.error);
                    };
                });
            }
            
            localStorage.setItem('indexeddb_migration_complete', 'true');
            
        } catch (error) {
            console.error('Error during migration:', error);
            throw error;
        }
    }

    /**
     * Load measurements from IndexedDB
     */
    async loadMeasurements() {
        try {
            const db = await this.openDatabase();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([this.STORE_NAME], 'readonly');
                const store = transaction.objectStore(this.STORE_NAME);
                const index = store.index('timestamp');
                
                // Use index to get measurements sorted by timestamp (descending)
                const request = index.openCursor(null, 'prev');
                const measurements = [];
                
                request.onsuccess = (event) => {
                    const cursor = event.target.result;
                    if (cursor) {
                        measurements.push(cursor.value);
                        cursor.continue();
                    } else {
                        // Done iterating
                        this.measurements = measurements;
                        
                        // Notify UI that measurements are loaded
                        this.dispatchEvent(this.EVENTS.MEASUREMENTS_LOADED, { 
                            count: measurements.length 
                        });
                        
                        resolve(this.measurements);
                    }
                };
                
                request.onerror = (event) => {
                    console.error('Error loading measurements:', event.target.error);
                    reject(event.target.error);
                };
            });
        } catch (error) {
            console.error('Error loading measurements:', error);
            return [];
        }
    }

    /**
     * Fallback to load from localStorage if IndexedDB fails
     */
    loadFromLocalStorage() {
        try {
            const storedData = localStorage.getItem(this.STORAGE_KEY);
            if (storedData) {
                this.measurements = JSON.parse(storedData);
                console.log(`Loaded ${this.measurements.length} measurements from localStorage (fallback)`);
            } else {
                this.measurements = [];
            }
        } catch (error) {
            console.error('Error loading measurements from localStorage:', error);
            this.measurements = [];
        }
        return this.measurements;
    }

    /**
     * Save measurements to IndexedDB
     */
    async saveMeasurements() {
        try {
            const db = await this.openDatabase();
            
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([this.STORE_NAME], 'readwrite');
                const store = transaction.objectStore(this.STORE_NAME);
                
                // Clear existing data and add all measurements
                const clearRequest = store.clear();
                
                clearRequest.onsuccess = () => {
                    // Add all measurements
                    let count = 0;
                    for (const measurement of this.measurements) {
                        store.put(measurement);
                        count++;
                    }
                    
                    console.log(`Saved ${count} measurements to IndexedDB`);
                };
                
                transaction.oncomplete = () => {
                    resolve(true);
                };
                
                transaction.onerror = (event) => {
                    console.error('Error saving measurements:', event.target.error);
                    
                    // Fallback to localStorage
                    try {
                        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.measurements));
                        console.log('Saved measurements to localStorage (fallback)');
                        resolve(true);
                    } catch (err) {
                        console.error('Failed to save to localStorage:', err);
                        reject(err);
                    }
                };
            });
        } catch (error) {
            console.error('Error in saveMeasurements:', error);
            
            // Fallback to localStorage
            try {
                localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.measurements));
                console.log('Saved measurements to localStorage (fallback)');
                return true;
            } catch (err) {
                console.error('Failed to save to localStorage:', err);
                return false;
            }
        }
    }

    /**
     * Get the "do not warn on delete" setting
     */
    async getDoNotWarnSetting() {
        try {
            const db = await this.openDatabase();
            
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([this.SETTINGS_STORE], 'readonly');
                const store = transaction.objectStore(this.SETTINGS_STORE);
                const request = store.get(this.DO_NOT_WARN_KEY);
                
                request.onsuccess = (event) => {
                    const result = event.target.result;
                    if (result) {
                        resolve(result.value);
                    } else {
                        resolve(false);
                    }
                };
                
                request.onerror = (event) => {
                    console.error('Error getting setting:', event.target.error);
                    // Fallback to localStorage
                    try {
                        resolve(localStorage.getItem(this.DO_NOT_WARN_KEY) === 'true');
                    } catch (err) {
                        resolve(false);
                    }
                };
            });
        } catch (error) {
            console.error('Error in getDoNotWarnSetting:', error);
            // Fallback to localStorage
            try {
                return localStorage.getItem(this.DO_NOT_WARN_KEY) === 'true';
            } catch (err) {
                return false;
            }
        }
    }

    /**
     * Set the "do not warn on delete" setting
     * @param {boolean} value - Whether to skip delete warnings
     */
    async setDoNotWarnSetting(value) {
        try {
            const db = await this.openDatabase();
            
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([this.SETTINGS_STORE], 'readwrite');
                const store = transaction.objectStore(this.SETTINGS_STORE);
                const request = store.put({ key: this.DO_NOT_WARN_KEY, value: value });
                
                transaction.oncomplete = () => {
                    // Also save to localStorage as a fallback
                    try {
                        localStorage.setItem(this.DO_NOT_WARN_KEY, value.toString());
                    } catch (e) {
                        console.warn('Failed to save setting to localStorage:', e);
                    }
                    resolve(true);
                };
                
                transaction.onerror = (event) => {
                    console.error('Error saving setting:', event.target.error);
                    // Try localStorage as fallback
                    try {
                        localStorage.setItem(this.DO_NOT_WARN_KEY, value.toString());
                        resolve(true);
                    } catch (err) {
                        reject(err);
                    }
                };
            });
        } catch (error) {
            console.error('Error in setDoNotWarnSetting:', error);
            // Fallback to localStorage
            try {
                localStorage.setItem(this.DO_NOT_WARN_KEY, value.toString());
                return true;
            } catch (err) {
                return false;
            }
        }
    }

    /**
     * Get all measurements
     * @returns {Array} Array of measurement objects
     */
    getAllMeasurements() {
        return [...this.measurements];
    }

    /**
     * Get measurement by ID
     * @param {string} id - Measurement ID
     * @returns {Object|null} Measurement object or null if not found
     */
    getMeasurementById(id) {
        return this.measurements.find(m => m.id === id) || null;
    }

    /**
     * Get the most recent measurement
     * @returns {Object|null} Most recent measurement or null if none exist
     */
    getLatestMeasurement() {
        if (this.measurements.length === 0) {
            return null;
        }
        return this.measurements[0]; // Measurements are stored with newest first
    }

    /**
     * Add a measurement or update if it already exists with the same ID
     * @param {Object} measurement - Measurement object
     * @returns {string} ID of the new or updated measurement
     */
    async addMeasurement(measurement) {
        // Ensure measurement has an ID and timestamp
        const measurementId = measurement.id || this.generateId();
        
        const newMeasurement = {
            ...measurement,
            id: measurementId,
            timestamp: measurement.timestamp || new Date().toISOString()
        };

        // Check if measurement with this ID already exists
        const existingIndex = this.measurements.findIndex(m => m.id === measurementId);
        
        if (existingIndex !== -1) {
            // Update existing measurement
            this.measurements[existingIndex] = {
                ...newMeasurement,
                lastModified: new Date().toISOString()
            };
            
            // Save to database
            await this.saveMeasurements();
            
            // Notify UI of updated measurement
            this.dispatchEvent(this.EVENTS.MEASUREMENT_UPDATED, {
                measurement: this.measurements[existingIndex]
            });
        } else {
            // Add new measurement to the beginning (newest first)
            this.measurements.unshift(newMeasurement);
            
            // Save to database
            await this.saveMeasurements();
            
            // Notify UI of new measurement
            this.dispatchEvent(this.EVENTS.MEASUREMENT_ADDED, {
                measurement: newMeasurement
            });
        }
        
        return measurementId;
    }

    /**
     * Update an existing measurement
     * @param {string} id - Measurement ID
     * @param {Object} updatedData - Updated measurement data
     * @returns {boolean} Success status
     */
    async updateMeasurement(id, updatedData) {
        const index = this.measurements.findIndex(m => m.id === id);
        if (index === -1) {
            return false;
        }

        // Update the measurement
        const updatedMeasurement = {
            ...this.measurements[index],
            ...updatedData,
            id: id, // Ensure ID doesn't change
            lastModified: new Date().toISOString()
        };
        
        this.measurements[index] = updatedMeasurement;

        await this.saveMeasurements();
        
        // Notify UI of updated measurement
        this.dispatchEvent(this.EVENTS.MEASUREMENT_UPDATED, {
            measurement: updatedMeasurement
        });
        
        return true;
    }

    /**
     * Delete a measurement
     * @param {string} id - ID of measurement to delete
     * @returns {boolean} Success status
     */
    async deleteMeasurement(id) {
        const initialLength = this.measurements.length;
        const deletedMeasurement = this.getMeasurementById(id);
        
        this.measurements = this.measurements.filter(m => m.id !== id);
        
        if (this.measurements.length < initialLength) {
            await this.saveMeasurements();
            
            // Notify UI of deleted measurement
            if (deletedMeasurement) {
                this.dispatchEvent(this.EVENTS.MEASUREMENT_DELETED, {
                    id: id,
                    measurement: deletedMeasurement
                });
            }
            
            return true;
        }
        return false;
    }

    /**
     * Generate a unique ID for a measurement
     * @returns {string} A unique ID
     */
    generateId() {
        return 'measurement_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Export a measurement to a JSON file
     * @param {string} id - Measurement ID
     * @returns {string|null} JSON string or null if measurement not found
     */
    exportMeasurementToJSON(id) {
        const measurement = this.getMeasurementById(id);
        if (!measurement) {
            return null;
        }
        
        return JSON.stringify(measurement, null, 2);
    }

    /**
     * Export PEQ parameters to CSV
     * @param {Array} peqParams - Array of PEQ parameters
     * @returns {string} CSV content
     */
    exportPEQtoCSV(peqParams) {
        if (!peqParams || !Array.isArray(peqParams) || peqParams.length === 0) {
            return 'Filter,Type,Freq,Gain,Q\n';
        }
        
        // Sort by frequency ascending
        const sortedParams = [...peqParams].sort((a, b) => a.frequency - b.frequency);
        
        let csv = 'Filter,Type,Freq,Gain,Q\n';
        
        sortedParams.forEach((param, index) => {
            csv += `${index + 1},PK,${param.frequency},${param.gain.toFixed(1)},${param.Q.toFixed(1)}\n`;
        });
        
        return csv;
    }

    /**
     * Import a measurement from JSON data
     * @param {string} jsonString - JSON string of measurement data
     * @returns {string|null} ID of imported measurement or null on error
     */
    async importMeasurementFromJSON(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            
            // Validate required fields
            if (!data.name || !data.points || !Array.isArray(data.points)) {
                console.error('Invalid measurement data format');
                return null;
            }
            
            // Give the imported measurement a new ID
            data.id = this.generateId();
            data.imported = true;
            data.importTimestamp = new Date().toISOString();
            
            return await this.addMeasurement(data);
        } catch (error) {
            console.error('Error importing measurement:', error);
            return null;
        }
    }

    /**
     * Encode Float32Array to base64 string for storage
     * @param {Float32Array} array - Float32Array to encode
     * @returns {string} Base64 encoded string
     */
    encodeFloat32Array(array) {
        const buffer = new ArrayBuffer(array.length * 4);
        const view = new DataView(buffer);
        
        for (let i = 0; i < array.length; i++) {
            view.setFloat32(i * 4, array[i], true);
        }
        
        const uint8Array = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < uint8Array.length; i++) {
            binary += String.fromCharCode(uint8Array[i]);
        }
        
        return btoa(binary);
    }

    /**
     * Decode base64 string to Float32Array
     * @param {string} base64 - Base64 encoded string
     * @returns {Float32Array} Decoded Float32Array
     */
    decodeFloat32Array(base64) {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        
        const buffer = bytes.buffer;
        return new Float32Array(buffer);
    }

    /**
     * Dispatch a custom event to notify UI components of data changes
     * @param {string} eventName - Name of the event
     * @param {any} detail - Additional data for the event
     */
    dispatchEvent(eventName, detail = {}) {
        const event = new CustomEvent(eventName, {
            detail,
            bubbles: true,
            cancelable: true
        });
        document.dispatchEvent(event);
    }

    /**
     * Save user settings to localStorage
     * @param {Object} settings - Settings object to save
     */
    saveUserSettings(settings) {
        try {
            localStorage.setItem(this.USER_SETTINGS_KEY, JSON.stringify(settings));
            console.log('User settings saved');
            return true;
        } catch (error) {
            console.error('Error saving user settings:', error);
            return false;
        }
    }

    /**
     * Load user settings from localStorage
     * @returns {Object} Settings object or empty object if not found
     */
    loadUserSettings() {
        try {
            const settings = localStorage.getItem(this.USER_SETTINGS_KEY);
            return settings ? JSON.parse(settings) : {};
        } catch (error) {
            console.error('Error loading user settings:', error);
            return {};
        }
    }

    /**
     * Save PEQ settings to localStorage
     * @param {Object} settings - PEQ settings object to save
     */
    savePEQSettings(settings) {
        try {
            localStorage.setItem(this.PEQ_SETTINGS_KEY, JSON.stringify(settings));
            console.log('PEQ settings saved');
            return true;
        } catch (error) {
            console.error('Error saving PEQ settings:', error);
            return false;
        }
    }

    /**
     * Load PEQ settings from localStorage
     * @returns {Object} PEQ settings object or empty object if not found
     */
    loadPEQSettings() {
        try {
            const settings = localStorage.getItem(this.PEQ_SETTINGS_KEY);
            return settings ? JSON.parse(settings) : {};
        } catch (error) {
            console.error('Error loading PEQ settings:', error);
            return {};
        }
    }
}

// Export a singleton instance
const dataStorage = new DataStorage();
export default dataStorage; 