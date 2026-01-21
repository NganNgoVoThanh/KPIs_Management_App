
import * as XLSX from 'xlsx';
import mammoth from 'mammoth';
import * as pdfParse from 'pdf-parse';

export class DocumentParser {
    /**
     * Parse various file formats to plain text
     */
    static async parseFile(buffer: Buffer, mimeType: string, fileName: string): Promise<string> {
        try {
            const ext = fileName.split('.').pop()?.toLowerCase();

            if (mimeType.includes('pdf') || ext === 'pdf') {
                return await this.parsePdf(buffer);
            } else if (
                mimeType.includes('spreadsheet') ||
                mimeType.includes('excel') ||
                ['xlsx', 'xls', 'csv'].includes(ext || '')
            ) {
                return this.parseExcel(buffer);
            } else if (
                mimeType.includes('wordprocessor') ||
                ['docx', 'doc'].includes(ext || '')
            ) {
                return await this.parseWord(buffer);
            } else if (mimeType.startsWith('text/') || ext === 'txt' || ext === 'md') {
                return buffer.toString('utf-8');
            }

            console.warn(`[DocumentParser] Unsupported file type: ${mimeType} (${fileName})`);
            return '';
        } catch (error) {
            console.error(`[DocumentParser] Failed to parse ${fileName}:`, error);
            throw error;
        }
    }

    private static async parsePdf(buffer: Buffer): Promise<string> {
        const data = await pdfParse(buffer);
        return data.text;
    }

    private static parseExcel(buffer: Buffer): string {
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        let text = '';

        workbook.SheetNames.forEach(sheetName => {
            const sheet = workbook.Sheets[sheetName];
            const sheetText = XLSX.utils.sheet_to_txt(sheet);
            text += `--- Sheet: ${sheetName} ---\n${sheetText}\n`;
        });

        return text;
    }

    private static async parseWord(buffer: Buffer): Promise<string> {
        const result = await mammoth.extractRawText({ buffer });
        return result.value;
    }
}
