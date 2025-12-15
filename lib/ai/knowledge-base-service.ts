import { enhancedAIServiceManager } from './ai-service-manager';
import { DatabaseService } from '@/lib/db';
import { DocumentParser } from './document-parser';
import { vectorStore } from './vector-store';
import OpenAI from 'openai';
import { getDatabase } from '@/lib/repositories/DatabaseFactory';

interface DocumentChunk {
    id: string;
    content: string;
    metadata: {
        sourceId: string;
        type: string;
        department?: string;
        jobTitle?: string;
    };
}

/**
 * Knowledge Base Service (RAG Implementation)
 * Handles indexing of KPI Library documents and retrieval for AI context.
 */
export class KnowledgeBaseService {
    private aiManager: enhancedAIServiceManager;
    private openai: OpenAI;

    constructor() {
        this.aiManager = new enhancedAIServiceManager();
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
            dangerouslyAllowBrowser: false // Server-side only
        });
    }

    /**
     * Index a document for the Knowledge Base
     */
    async indexDocument(
        resourceId: string,
        base64Content: string,
        metadata: { mimeType: string; fileName: string; department?: string; type?: string }
    ): Promise<boolean> {
        try {
            console.log(`[RAG] Indexing document ${metadata.fileName} (${resourceId})...`);

            // 1. Parse File Content
            // Convert base64 data URL to Buffer
            // Format: data:application/pdf;base64,.....
            const base64Data = base64Content.split(',')[1];
            if (!base64Data) throw new Error('Invalid base64 content');

            const buffer = Buffer.from(base64Data, 'base64');
            const textContent = await DocumentParser.parseFile(buffer, metadata.mimeType, metadata.fileName);

            if (!textContent || textContent.trim().length === 0) {
                console.warn('[RAG] No text extracted from document');
                return false;
            }

            // 2. Chunking
            const chunks = this.chunkText(textContent, 1000); // ~1000 chars per chunk
            console.log(`[RAG] Created ${chunks.length} chunks`);

            // 3. Embed and Store
            const vectorDocs = [];

            for (const chunk of chunks) {
                const embedding = await this.getEmbedding(chunk);

                vectorDocs.push({
                    id: `chunk-${resourceId}-${Math.random().toString(36).substr(2, 9)}`,
                    sourceId: resourceId,
                    content: chunk,
                    metadata: {
                        ...metadata,
                        text: chunk.substring(0, 100) + '...'
                    },
                    embedding
                });
            }

            await vectorStore.addDocuments(vectorDocs);
            console.log(`[RAG] Successfully indexed ${chunks.length} chunks`);

            // 4. Update Resource Status
            const db = getDatabase();
            await db.updateKpiResource(resourceId, {
                aiIndexed: true,
                vectorId: `indexed-${chunks.length}-chunks`
            });

            return true;
        } catch (error) {
            console.error('[RAG] Indexing failed:', error);
            return false;
        }
    }

    /**
     * Retrieve relevant context for a specific user/role/goal
     */
    async retrieveContext(query: string, filter?: { department?: string }): Promise<string> {
        try {
            console.log(`[RAG] Retrieving context for: "${query}"`);

            // 1. Embed query
            const queryEmbedding = await this.getEmbedding(query);

            // 2. Search Vector Store
            const relevantDocs = await vectorStore.search(queryEmbedding, 5);

            if (relevantDocs.length === 0) {
                // Fallback to legacy context if no vectors found
                return this.getLegacyContext(query, filter);
            }

            // 3. Format Context
            const context = relevantDocs.map(doc =>
                `- [${doc.metadata.fileName || 'Doc'}]: ${doc.content}`
            ).join('\n\n');

            return `\nRELEVANT KNOWLEDGE BASE CONTEXT:\n${context}\n`;

        } catch (error) {
            console.error('[RAG] Retrieval failed:', error);
            return '';
        }
    }

    private async getEmbedding(text: string): Promise<number[]> {
        const response = await this.openai.embeddings.create({
            model: "text-embedding-3-small", // Cost-effective model
            input: text.replace(/\n/g, ' ')
        });
        return response.data[0].embedding;
    }

    private chunkText(text: string, chunkSize: number): string[] {
        const chunks = [];
        for (let i = 0; i < text.length; i += chunkSize) {
            chunks.push(text.slice(i, i + chunkSize));
        }
        return chunks;
    }

    // Fallback using SQL-like search if Vector Store is empty
    private async getLegacyContext(query: string, filter?: { department?: string }): Promise<string> {
        const db = getDatabase();
        const libraryEntries = await db.getKpiLibraryEntries({
            department: filter?.department
        });

        if (libraryEntries.length === 0) return '';

        const context = libraryEntries.map(entry =>
            `- KPI: ${entry.kpiName} (${entry.kpiType}) for ${entry.jobTitle || 'General'}. Target: ${entry.yearlyTarget || 'N/A'}`
        ).join('\n');

        return `\nRELEVANT KPI LIBRARY CONTEXT (Legacy):\n${context}\n`;
    }
}

export const knowledgeBaseService = new KnowledgeBaseService();
