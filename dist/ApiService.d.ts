declare class ApiError extends Error {
    code: number | string;
    data: any;
    guid: string;
    constructor(message: string, code?: number | string, data?: any, guid?: string);
}

declare class ApiAuthError extends ApiError {
    constructor(message: string, code?: number, data?: any, guid?: string);
}

declare class ApiConfig {
    baseUrl: string;
    baseUrlParams: string;
    useAuthentication: boolean;
    getAccessTokenFn: () => Promise<string>;
    constructor(baseUrl: string, baseUrlParams: string, useAuthentication: boolean, getAccessTokenFn?: () => Promise<string>);
}

declare class ApiRequestQueueItem {
    id: string;
    created: Date;
    url: string;
    data: any;
    config: RequestInit;
    abortController: AbortController;
    authentication: boolean;
    constructor(id?: string, url?: string, data?: any, config?: RequestInit, abortController?: AbortController, authentication?: boolean);
}

declare class ApiAdvancedResponse {
    id: string;
    response: Promise<Response>;
    constructor(requestQueueItem: ApiRequestQueueItem, response: Promise<Response>);
}

declare class ApiService {
    private readonly serviceId;
    config: ApiConfig;
    private requestsQueue;
    /**
     *
     * @param {ApiConfig} apiConfig
     */
    constructor(apiConfig: ApiConfig);
    private createRequest;
    buildUrl(urlPath: string): string;
    buildConfig: (method?: string, options?: RequestInit, data?: any, abortController?: AbortController | null, authentication?: boolean, requestId?: string) => Promise<RequestInit>;
    /**
     * Standardize error reporting up the stack to our ApiError
     * @param {Error} e
     * @throws {Error|ApiAuthError|ApiError}
     */
    private apiErrorCatch;
    cancelRequests: (requestIds?: string[]) => Promise<void>;
    cancelRequest: (requestId?: string) => Promise<void>;
    cancelAll: () => Promise<void>;
    /**
     * @throws {Error|ApiAuthError|ApiError}
     */
    getAdv: (url: string, options?: RequestInit, authentication?: boolean) => Promise<ApiAdvancedResponse>;
    /**
     * @throws {Error|ApiAuthError|ApiError}
     */
    get: (url: string, options?: RequestInit, authentication?: boolean) => Promise<Response>;
    /**
     * @throws {Error|ApiAuthError|ApiError}
     */
    getAllPaged: <T>(url: string, options?: RequestInit, authentication?: boolean, page?: number, itemsPerPage?: number, collection?: T[]) => Promise<T[]>;
    /**
     * @throws {Error|ApiAuthError|ApiError}
     */
    postAdv: (url: string, data: any, options?: RequestInit, authentication?: boolean) => Promise<ApiAdvancedResponse>;
    /**
     * @throws {Error|ApiAuthError|ApiError}
     */
    post: (url: string, data: any, options?: RequestInit, authentication?: boolean) => Promise<Response>;
    /**
     * @throws {Error|ApiAuthError|ApiError}
     */
    postForm: (url: string, data: any, options?: RequestInit, authentication?: boolean) => Promise<Response>;
    /**
     * @throws {Error|ApiAuthError|ApiError}
     */
    put: (url: string, data: any, options?: RequestInit, authentication?: boolean) => Promise<Response>;
    /**
     * @throws {Error|ApiAuthError|ApiError}
     */
    delete: (url: string, options?: RequestInit, authentication?: boolean) => Promise<Response>;
    /**
     * @throws {Error|ApiAuthError|ApiError}
     */
    postDownload: (url: string, data: any, options?: RequestInit, authentication?: boolean) => Promise<void>;
    /**
     * @throws {Error|ApiAuthError|ApiError}
     */
    getDownload: (url: string, options?: RequestInit, authentication?: boolean) => Promise<void>;
    private doBrowserDownload;
    /**
     * @throws {Error|ApiAuthError|ApiError}
     */
    upload: (url: string, files: Array<File>, options?: RequestInit, authentication?: boolean) => Promise<Response>;
}

export { ApiAdvancedResponse, ApiAuthError, ApiConfig, ApiError, ApiRequestQueueItem, ApiService as default };
