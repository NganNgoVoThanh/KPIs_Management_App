// lib/ai/ai-service-manager.ts
// Fixed version - removed circular dependencies

interface enhancedAIServiceConfig {
  provider: 'anthropic' | 'openai' | 'local';
  apiKey?: string;
  endpoint?: string;
  maxRetries: number;
  timeoutMs: number;
  rateLimitRpm: number;
  cacheEnabled: boolean;
  cacheTtlMs: number;
  debugMode: boolean;
}

interface enhancedAIServiceCall {
  id: string;
  serviceName: string;
  method: string;
  params: any;
  timestamp: string;
  userId?: string;
  status: 'pending' | 'success' | 'error' | 'timeout';
  duration?: number;
  error?: string;
  result?: any;
}

interface AIUsageMetrics {
  totalCalls: number;
  successRate: number;
  averageResponseTime: number;
  errorCount: number;
  cacheHitRate: number;
  costEstimate: number;
  serviceCalls: Record<string, number>;
}

interface enhancedAIServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  cached?: boolean;
  duration: number;
  callId: string;
}

export class enhancedAIServiceManager {
  private config: enhancedAIServiceConfig;
  private services: Map<string, any>;
  private callHistory: enhancedAIServiceCall[] = [];
  private rateLimiter: Map<string, number[]> = new Map();
  private cache: Map<string, { data: any; timestamp: number; ttl: number }> = new Map();
  private cleanupInterval?: NodeJS.Timeout;

  constructor(config?: Partial<enhancedAIServiceConfig>) {
    this.config = {
      provider: (process.env.AI_SERVICE_PROVIDER as 'anthropic' | 'openai' | 'local') || 'anthropic',
      apiKey: process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY,
      maxRetries: 3,
      timeoutMs: 30000,
      rateLimitRpm: 100,
      cacheEnabled: true,
      cacheTtlMs: 300000,
      debugMode: process.env.NODE_ENV === 'development',
      ...config
    };

    this.services = new Map();
    this.initializeServices();
    this.setupCacheCleanup();
  }

  private initializeServices(): void {
    // Initialize services without circular dependencies
    // Services will be created lazily when needed
    this.services.set('document-analyzer', this.createDocumentAnalyzer());
    this.services.set('text-processor', this.createTextProcessor());

    if (this.config.debugMode) {
      console.log(`AI Service Manager initialized with ${this.services.size} core services`);
    }
  }

  // Lazy initialization methods for AI services
  private getKpiSuggestionService() {
    if (!this.services.has('kpi-suggestion')) {
      // Import dynamically to avoid circular dependency
      const { SmartKpiSuggestionService } = require('./kpi-suggestion-service');
      const service = new SmartKpiSuggestionService();
      // Set the aiManager reference without creating new instance
      (service as any).aiManager = this;
      this.services.set('kpi-suggestion', service);
    }
    return this.services.get('kpi-suggestion');
  }

  private getSmartValidator() {
    if (!this.services.has('smart-validator')) {
      const { SmartValidator } = require('./smart-validator');
      const service = new SmartValidator();
      (service as any).aiManager = this;
      this.services.set('smart-validator', service);
    }
    return this.services.get('smart-validator');
  }

  private getAnomalyDetector() {
    if (!this.services.has('anomaly-detector')) {
      const { AnomalyFraudDetector } = require('./anomaly-fraud-detector');
      const service = new AnomalyFraudDetector();
      (service as any).aiManager = this;
      this.services.set('anomaly-detector', service);
    }
    return this.services.get('anomaly-detector');
  }

  private getApprovalAssistant() {
    if (!this.services.has('approval-assistant')) {
      const { ApprovalAssistanceService } = require('./approval-assistance-service');
      const service = new ApprovalAssistanceService();
      (service as any).aiManager = this;
      this.services.set('approval-assistant', service);
    }
    return this.services.get('approval-assistant');
  }

  async callService<T>(
    serviceName: string, 
    method: string, 
    params: any,
    options?: {
      bypassCache?: boolean;
      priority?: 'low' | 'normal' | 'high';
      userId?: string;
    }
  ): Promise<enhancedAIServiceResponse<T>> {
    const callId = this.generateCallId();
    const startTime = Date.now();

    const callRecord: enhancedAIServiceCall = {
      id: callId,
      serviceName,
      method,
      params: this.sanitizeParamsForLogging(params),
      timestamp: new Date().toISOString(),
      userId: options?.userId,
      status: 'pending'
    };

    try {
      if (!this.checkRateLimit(serviceName)) {
        throw new Error(`Rate limit exceeded for ${serviceName}`);
      }

      const cacheKey = this.generateCacheKey(serviceName, method, params);
      if (this.config.cacheEnabled && !options?.bypassCache) {
        const cachedResult = this.getCachedResult(cacheKey);
        if (cachedResult) {
          callRecord.status = 'success';
          callRecord.duration = Date.now() - startTime;
          this.callHistory.push(callRecord);
          
          return {
            success: true,
            data: cachedResult,
            cached: true,
            duration: callRecord.duration,
            callId
          };
        }
      }

      const result = await this.executeServiceCall<T>(serviceName, method, params);
      
      if (this.config.cacheEnabled && result) {
        this.setCachedResult(cacheKey, result);
      }

      callRecord.status = 'success';
      callRecord.duration = Date.now() - startTime;
      callRecord.result = this.sanitizeResultForLogging(result);

      return {
        success: true,
        data: result,
        cached: false,
        duration: callRecord.duration,
        callId
      };

    } catch (error) {
      callRecord.status = 'error';
      callRecord.duration = Date.now() - startTime;
      callRecord.error = error instanceof Error ? error.message : 'Unknown error';

      if (this.config.debugMode) {
        console.error(`AI Service call failed:`, callRecord);
      }

      return {
        success: false,
        error: callRecord.error,
        duration: callRecord.duration,
        callId
      };

    } finally {
      this.callHistory.push(callRecord);
      this.updateRateLimit(serviceName);
    }
  }

  private async executeServiceCall<T>(
    serviceName: string, 
    method: string, 
    params: any
  ): Promise<T> {
    // Get service with lazy loading
    let service: any;
    
    switch (serviceName) {
      case 'kpi-suggestion':
        service = this.getKpiSuggestionService();
        break;
      case 'smart-validator':
        service = this.getSmartValidator();
        break;
      case 'anomaly-detector':
        service = this.getAnomalyDetector();
        break;
      case 'approval-assistant':
        service = this.getApprovalAssistant();
        break;
      default:
        service = this.services.get(serviceName);
    }
    
    if (!service) {
      throw new Error(`Service ${serviceName} not found`);
    }

    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        const result = await Promise.race([
          this.callServiceMethod(service, method, params),
          this.createTimeoutPromise()
        ]);

        return result as T;

      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        if (attempt < this.config.maxRetries) {
          const delay = Math.pow(2, attempt - 1) * 1000;
          await this.delay(delay);
          
          if (this.config.debugMode) {
            console.log(`Retry attempt ${attempt + 1} for ${serviceName}.${method} after ${delay}ms`);
          }
        }
      }
    }

    throw lastError || new Error('Service call failed after retries');
  }

  private async callServiceMethod(service: any, method: string, params: any): Promise<any> {
    if (typeof service[method] !== 'function') {
      throw new Error(`Method ${method} not found on service`);
    }

    if (params.prompt) {
      return await this.executeAIPrompt(params.prompt, params);
    } else {
      return await service[method](params);
    }
  }

  private async executeAIPrompt(prompt: string, context: any): Promise<any> {
    switch (this.config.provider) {
      case 'anthropic':
        return await this.callAnthropicAPI(prompt, context);
      case 'openai':
        return await this.callOpenAIAPI(prompt, context);
      case 'local':
        return await this.callLocalAI(prompt, context);
      default:
        throw new Error(`Unknown AI provider: ${this.config.provider}`);
    }
  }

  private async callAnthropicAPI(prompt: string, context: any): Promise<any> {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.config.apiKey!,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-3-sonnet-20240229",
        max_tokens: context.maxTokens || 4000,
        messages: [{ 
          role: "user", 
          content: prompt 
        }],
        temperature: context.temperature || 0.3
      })
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.content[0]?.text;

    try {
      if (content.trim().startsWith('{') || content.trim().startsWith('[')) {
        return JSON.parse(content);
      }
    } catch {
      // Return as text if not valid JSON
    }

    return content;
  }

  private async callOpenAIAPI(prompt: string, context: any): Promise<any> {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify({
        model: context.model || "gpt-4",
        messages: [{ 
          role: "user", 
          content: prompt 
        }],
        max_tokens: context.maxTokens || 4000,
        temperature: context.temperature || 0.3
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    try {
      if (content.trim().startsWith('{') || content.trim().startsWith('[')) {
        return JSON.parse(content);
      }
    } catch {
      // Return as text if not valid JSON
    }

    return content;
  }

  private async callLocalAI(prompt: string, context: any): Promise<any> {
    const endpoint = this.config.endpoint || 'http://localhost:8000/ai/chat';
    
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        prompt,
        context,
        model: context.model || 'local-llm'
      })
    });

    if (!response.ok) {
      throw new Error(`Local AI error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.response || data;
  }

  private checkRateLimit(serviceName: string): boolean {
    const now = Date.now();
    const windowMs = 60000;
    const key = serviceName;

    if (!this.rateLimiter.has(key)) {
      this.rateLimiter.set(key, []);
    }

    const calls = this.rateLimiter.get(key)!;
    const validCalls = calls.filter(timestamp => now - timestamp < windowMs);
    this.rateLimiter.set(key, validCalls);

    return validCalls.length < this.config.rateLimitRpm;
  }

  private updateRateLimit(serviceName: string): void {
    const now = Date.now();
    const key = serviceName;

    if (!this.rateLimiter.has(key)) {
      this.rateLimiter.set(key, []);
    }

    const calls = this.rateLimiter.get(key)!;
    calls.push(now);
  }

  private generateCacheKey(serviceName: string, method: string, params: any): string {
    const paramStr = JSON.stringify(params);
    const hash = this.simpleHash(paramStr);
    return `${serviceName}-${method}-${hash}`;
  }

  private getCachedResult(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const now = Date.now();
    if (now - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  private setCachedResult(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: this.config.cacheTtlMs
    });
  }

  private setupCacheCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, cached] of this.cache.entries()) {
        if (now - cached.timestamp > cached.ttl) {
          this.cache.delete(key);
        }
      }
    }, 300000);
  }

  private createDocumentAnalyzer(): any {
    return {
      analyzeEvidence: async (params: { prompt: string; filePath: string }) => {
        const documentContent = await this.extractDocumentContent(params.filePath);
        const analysisPrompt = `${params.prompt}\n\nDOCUMENT CONTENT:\n${documentContent}`;
        
        return await this.executeAIPrompt(analysisPrompt, {
          maxTokens: 2000,
          temperature: 0.1
        });
      },

      extractData: async (params: { filePath: string; expectedFields: string[] }) => {
        const content = await this.extractDocumentContent(params.filePath);
        const extractionPrompt = `
          Extract the following data fields from this document:
          Fields: ${params.expectedFields.join(', ')}
          
          Document content:
          ${content}
          
          Return as JSON with the requested fields.
        `;
        
        return await this.executeAIPrompt(extractionPrompt, {
          maxTokens: 1000,
          temperature: 0.1
        });
      },

      healthCheck: async () => {
        return { status: 'ok' };
      }
    };
  }

  private createTextProcessor(): any {
    return {
      summarize: async (params: { text: string; maxLength?: number }) => {
        const prompt = `
          Summarize the following text in ${params.maxLength || 200} words or less:
          
          ${params.text}
          
          Focus on key points and actionable items.
        `;
        
        return await this.executeAIPrompt(prompt, {
          maxTokens: 500,
          temperature: 0.3
        });
      },

      analyze: async (params: { prompt: string }) => {
        return await this.executeAIPrompt(params.prompt, {
          maxTokens: 1000,
          temperature: 0.3
        });
      },

      healthCheck: async () => {
        return { status: 'ok' };
      }
    };
  }

  private async extractDocumentContent(filePath: string): Promise<string> {
    try {
      const fileExtension = filePath.split('.').pop()?.toLowerCase();
      
      switch (fileExtension) {
        case 'pdf':
          return await this.extractPDFContent(filePath);
        case 'xlsx':
        case 'xls':
          return await this.extractExcelContent(filePath);
        case 'docx':
          return await this.extractWordContent(filePath);
        case 'jpg':
        case 'jpeg':
        case 'png':
          return await this.extractImageText(filePath);
        default:
          throw new Error(`Unsupported file type: ${fileExtension}`);
      }
    } catch (error) {
      console.error(`Error extracting content from ${filePath}:`, error);
      return '';
    }
  }

  private async extractPDFContent(filePath: string): Promise<string> {
    return 'PDF content extraction not implemented yet';
  }

  private async extractExcelContent(filePath: string): Promise<string> {
    return 'Excel content extraction not implemented yet';
  }

  private async extractWordContent(filePath: string): Promise<string> {
    return 'Word content extraction not implemented yet';
  }

  private async extractImageText(filePath: string): Promise<string> {
    return 'Image OCR not implemented yet';
  }

  private generateCallId(): string {
    return `ai-call-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  private sanitizeParamsForLogging(params: any): any {
    const sanitized = { ...params };
    
    if (sanitized.apiKey) delete sanitized.apiKey;
    if (sanitized.password) delete sanitized.password;
    if (sanitized.token) delete sanitized.token;
    
    if (sanitized.prompt && sanitized.prompt.length > 500) {
      sanitized.prompt = sanitized.prompt.substring(0, 500) + '...';
    }
    
    return sanitized;
  }

  private sanitizeResultForLogging(result: any): any {
    if (typeof result === 'string' && result.length > 1000) {
      return result.substring(0, 1000) + '...';
    }
    
    if (typeof result === 'object') {
      return { ...result, _truncated: true };
    }
    
    return result;
  }

  private createTimeoutPromise(): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error('AI service call timeout'));
      }, this.config.timeoutMs);
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getUsageMetrics(): AIUsageMetrics {
    const totalCalls = this.callHistory.length;
    const successfulCalls = this.callHistory.filter(c => c.status === 'success').length;
    const errorCalls = this.callHistory.filter(c => c.status === 'error').length;
    
    const durations = this.callHistory
      .filter(c => c.duration)
      .map(c => c.duration!);
    
    const avgResponseTime = durations.length > 0 
      ? durations.reduce((sum, d) => sum + d, 0) / durations.length 
      : 0;

    const serviceCalls = this.callHistory.reduce((counts, call) => {
      counts[call.serviceName] = (counts[call.serviceName] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);

    return {
      totalCalls,
      successRate: totalCalls > 0 ? (successfulCalls / totalCalls) * 100 : 0,
      averageResponseTime: Math.round(avgResponseTime),
      errorCount: errorCalls,
      cacheHitRate: this.calculateCacheHitRate(),
      costEstimate: this.estimateCosts(),
      serviceCalls
    };
  }

  getCallHistory(limit: number = 50): enhancedAIServiceCall[] {
    return this.callHistory
      .slice(-limit)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  clearCache(): void {
    this.cache.clear();
    if (this.config.debugMode) {
      console.log('AI Service cache cleared');
    }
  }

  updateConfig(updates: Partial<enhancedAIServiceConfig>): void {
    this.config = { ...this.config, ...updates };
    
    if (this.config.debugMode) {
      console.log('AI Service configuration updated:', updates);
    }
  }

  async healthCheck(): Promise<{ status: string; services: Record<string, boolean> }> {
    const serviceHealth: Record<string, boolean> = {};
    
    for (const [serviceName, service] of this.services) {
      try {
        if (typeof service.healthCheck === 'function') {
          await service.healthCheck();
          serviceHealth[serviceName] = true;
        } else {
          serviceHealth[serviceName] = true;
        }
      } catch {
        serviceHealth[serviceName] = false;
      }
    }
    
    const allHealthy = Object.values(serviceHealth).every(healthy => healthy);
    
    return {
      status: allHealthy ? 'healthy' : 'degraded',
      services: serviceHealth
    };
  }

  private calculateCacheHitRate(): number {
    const cachedCalls = this.callHistory.filter(c => c.status === 'success' && c.duration! < 100).length;
    const totalCalls = this.callHistory.filter(c => c.status === 'success').length;
    
    return totalCalls > 0 ? (cachedCalls / totalCalls) * 100 : 0;
  }

  private estimateCosts(): number {
    const apiCalls = this.callHistory.filter(c => c.status === 'success' && c.duration! > 100).length;
    return apiCalls * 0.01;
  }

  cleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.cache.clear();
    this.callHistory.length = 0;
    this.rateLimiter.clear();
    
    if (this.config.debugMode) {
      console.log('AI Service Manager cleaned up');
    }
  }
}