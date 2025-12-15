
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

    constructor() {
        this.storePath = path.join(process.cwd(), '.local-storage', 'vector-store.json');
        this.loadStore();
    }

    private loadStore() {
        try {
            if (fs.existsSync(this.storePath)) {
                const data = fs.readFileSync(this.storePath, 'utf-8');
                this.documents = JSON.parse(data);
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

    private saveStore() {
        try {
            fs.writeFileSync(this.storePath, JSON.stringify(this.documents, null, 2));
        } catch (error) {
            console.error('[VectorStore] Failed to save store:', error);
        }
    }

    async addDocuments(docs: VectorDocument[]) {
        this.documents.push(...docs);
        this.saveStore();
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
