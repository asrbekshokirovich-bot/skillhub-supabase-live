import { db } from '../firebase';
import { collection, doc, getDocs, getDoc, setDoc, addDoc, updateDoc, deleteDoc, query } from 'firebase/firestore';
import { handleApiError } from '../utils/errors';

export class BaseRepository {
  constructor(collectionPath) {
    this.collectionPath = collectionPath;
  }

  getCollectionRef() {
    return collection(db, this.collectionPath);
  }

  getDocRef(id) {
    return doc(db, this.collectionPath, id);
  }

  /**
   * Find all documents, optionally passing a Firestore Query
   */
  async findAll(customQuery = null) {
    try {
      const q = customQuery || query(this.getCollectionRef());
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
      handleApiError(e, `findAll on ${this.collectionPath}`);
    }
  }

  /**
   * Find a specific document by ID
   */
  async findById(id) {
    try {
      const docSnap = await getDoc(this.getDocRef(id));
      if (!docSnap.exists()) return null;
      return { id: docSnap.id, ...docSnap.data() };
    } catch (e) {
      handleApiError(e, `findById on ${this.collectionPath}`);
    }
  }

  /**
   * Create a new document with an auto-generated ID
   */
  async create(data) {
    try {
      const docRef = await addDoc(this.getCollectionRef(), data);
      return { id: docRef.id, ...data };
    } catch (e) {
      handleApiError(e, `create on ${this.collectionPath}`);
    }
  }

  /**
   * Set a document with a specific ID (creates or overwrites)
   */
  async set(id, data, options = { merge: true }) {
    try {
      await setDoc(this.getDocRef(id), data, options);
      return { id, ...data };
    } catch (e) {
      handleApiError(e, `set on ${this.collectionPath}`);
    }
  }

  /**
   * Update specific fields of an existing document
   */
  async update(id, data) {
    try {
      await updateDoc(this.getDocRef(id), data);
      return { id, ...data };
    } catch (e) {
      handleApiError(e, `update on ${this.collectionPath}`);
    }
  }

  /**
   * Delete a document
   */
  async delete(id) {
    try {
      await deleteDoc(this.getDocRef(id));
      return { success: true };
    } catch (e) {
      handleApiError(e, `delete on ${this.collectionPath}`);
    }
  }
}
