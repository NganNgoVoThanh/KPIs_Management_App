
import fs from 'fs';
import path from 'path';

export interface VectorDocument {
    id: string;
    sourceId: string; // Link to KpiResource or other source
    content: string;
    metadata: any;
    embedding: number[];
}

export class SimpleVectorStore {
    private storePath: string;
    private documents: VectorDocument[] = [];
    private writeLock: Promise<void> = Promise.resolve();

    constructor() {
        this.storePath = path.join(process.cwd(), '.local-storage', 'vector-store.json');
        this.loadStore();
    }

    private loadStore() {
        try {
            if (fs.existsSync(this.storePath)) {
                const data = fs.readFileSync(this.storePath, 'utf-8');
                const parsed = JSON.parse(data);

                // Validate data structure
                if (!Array.isArray(parsed)) {
                    console.warn('[VectorStore] Invalid data format, starting fresh');
                    this.documents = [];
                } else {
                    this.documents = parsed;
                }
            } else {
                // Ensure directory exists
                const dir = path.dirname(this.storePath);
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                }
            }
        } catch (error) {
            console.error('[VectorStore] Failed to load store:', error);
            this.documents = [];
        }
    }

    private async saveStore() {
        try {
            await fs.promises.writeFile(
                this.storePath,
                JSON.stringify(this.documents, null, 2),
                'utf-8'
            );
        } catch (error) {
            console.error('[VectorStore] Failed to save store:', error);
            throw error;
        }
    }

    async addDocuments(docs: VectorDocument[]) {
        // Wait for any ongoing writes to complete
        await this.writeLock;

        // Create new lock for this operation
        this.writeLock = (async () => {
            try {
                // Reload from disk to get latest state
                this.loadStore();

                // Add new documents
                this.documents.push(...docs);

                // Save to disk
                await this.saveStore();

                console.log(`[VectorStore] Added ${docs.length} documents. Total: ${this.documents.length}`);
            } catch (error) {
                console.error('[VectorStore] Failed to add documents:', error);
                throw error;
            }
        })();

        // Wait for write to complete
        await this.writeLock;
    }

    async search(queryEmbedding: number[], limit: number = 5): Promise<VectorDocument[]> {
        if (this.documents.length === 0) return [];

        // Calculate cosine similarity for all docs
        const scoredDocs = this.documents.map(doc => ({
            doc,
            score: this.cosineSimilarity(queryEmbedding, doc.embedding)
        }));

        // Sort by score (descending)
        scoredDocs.sort((a, b) => b.score - a.score);

        return scoredDocs.slice(0, limit).map(item => item.doc);
    }

    private cosineSimilarity(vecA: number[], vecB: number[]): number {
        const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
        const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
        const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));

        if (magnitudeA === 0 || magnitudeB === 0) return 0;
        return dotProduct / (magnitudeA * magnitudeB);
    }
}

export const vectorStore = new SimpleVectorStore();
