/**
 * Storage Manager - Handles secure local storage with encryption
 */

class StorageManager {
  constructor() {
    this.encryptionKey = null;
  }

  /**
   * Initialize encryption key (simple XOR encryption for demo - in production use proper encryption)
   */
  async initEncryptionKey() {
    if (!this.encryptionKey) {
      // Generate or retrieve encryption key from storage
      const result = await chrome.storage.local.get(['encryptionKey']);
      if (result.encryptionKey) {
        this.encryptionKey = result.encryptionKey;
      } else {
        // Generate a simple key (in production, use proper key generation)
        this.encryptionKey = this.generateKey();
        await chrome.storage.local.set({ encryptionKey: this.encryptionKey });
      }
    }
    return this.encryptionKey;
  }

  /**
   * Generate a simple encryption key
   */
  generateKey() {
    return Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Simple XOR encryption (for demo - use proper encryption in production)
   */
  encrypt(text, key) {
    if (!text) return text;
    const textBytes = new TextEncoder().encode(text);
    const keyBytes = new TextEncoder().encode(key);
    const encrypted = textBytes.map((byte, i) => byte ^ keyBytes[i % keyBytes.length]);
    return Array.from(encrypted).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Simple XOR decryption (for demo - use proper decryption in production)
   */
  decrypt(encryptedHex, key) {
    if (!encryptedHex) return encryptedHex;
    const encrypted = new Uint8Array(
      encryptedHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16))
    );
    const keyBytes = new TextEncoder().encode(key);
    const decrypted = encrypted.map((byte, i) => byte ^ keyBytes[i % keyBytes.length]);
    return new TextDecoder().decode(decrypted);
  }

  /**
   * Encrypt sensitive fields in data object
   */
  async encryptSensitiveFields(data) {
    await this.initEncryptionKey();
    const sensitiveFields = ['ssn', 'accountNumber', 'licenseNumber', 'socialSecurityNumber'];
    const encrypted = { ...data };

    for (const field of sensitiveFields) {
      if (encrypted[field]) {
        encrypted[field] = this.encrypt(encrypted[field], this.encryptionKey);
      }
    }

    return encrypted;
  }

  /**
   * Decrypt sensitive fields in data object
   */
  async decryptSensitiveFields(data) {
    await this.initEncryptionKey();
    const sensitiveFields = ['ssn', 'accountNumber', 'licenseNumber', 'socialSecurityNumber'];
    const decrypted = { ...data };

    for (const field of sensitiveFields) {
      if (decrypted[field]) {
        decrypted[field] = this.decrypt(decrypted[field], this.encryptionKey);
      }
    }

    return decrypted;
  }

  /**
   * Save extracted data to storage
   */
  async saveData(data) {
    try {
      const encrypted = await this.encryptSensitiveFields(data);
      await chrome.storage.local.set({ 
        extractedData: encrypted,
        lastUpdated: new Date().toISOString()
      });
      return true;
    } catch (error) {
      console.error('Error saving data:', error);
      return false;
    }
  }

  /**
   * Get stored data from storage
   */
  async getData() {
    try {
      const result = await chrome.storage.local.get(['extractedData']);
      if (result.extractedData) {
        return await this.decryptSensitiveFields(result.extractedData);
      }
      return null;
    } catch (error) {
      console.error('Error getting data:', error);
      return null;
    }
  }

  /**
   * Clear all stored data
   */
  async clearData() {
    try {
      await chrome.storage.local.remove(['extractedData', 'lastUpdated']);
      return true;
    } catch (error) {
      console.error('Error clearing data:', error);
      return false;
    }
  }

  /**
   * Update specific field in stored data
   */
  async updateField(fieldName, value) {
    try {
      const data = await this.getData();
      if (data) {
        data[fieldName] = value;
        await this.saveData(data);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error updating field:', error);
      return false;
    }
  }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = StorageManager;
}
