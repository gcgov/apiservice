import { AxiosRequestConfig, AxiosResponse } from 'axios';

declare class ApiError extends Error {
    code: number;
    data: any;
    guid: string;
    constructor(message: string, code?: number, data?: any, guid?: string);
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
    axiosConfig: AxiosRequestConfig;
    abortController: AbortController;
    authentication: boolean;
    constructor(id?: string, url?: string, data?: any, axiosConfig?: AxiosRequestConfig, abortController?: AbortController, authentication?: boolean);
}

declare class ApiAdvancedResponse {
    id: string;
    response: Promise<AxiosResponse<any>>;
    constructor(requestQueueItem: ApiRequestQueueItem, response: Promise<AxiosResponse<any>>);
}

declare class ApiService {
    private serviceId;
    private config;
    private requestsQueue;
    private axiosInstance;
    /**
     *
     * @param {ApiConfig} apiConfig
     */
    constructor(apiConfig: ApiConfig);
    private createRequest;
    private buildUrl;
    private buildAxiosConfig;
    /**
     * Standardize error reporting up the stack to our ApiError
     * @param {Error} e
     * @throws {Error|ApiAuthError|ApiError}
     */
    private apiErrorCatch;
    cancelRequest: (requestId?: string) => Promise<void>;
    cancelRequests: (requestIds?: string[]) => Promise<void>;
    cancelAll: () => Promise<void>;
    /**
     * @throws {Error|ApiAuthError|ApiError}
     */
    getAdv: (url: string, options?: AxiosRequestConfig<any>, authentication?: boolean) => Promise<ApiAdvancedResponse>;
    /**
     * @throws {Error|ApiAuthError|ApiError}
     */
    get: (url: string, options?: AxiosRequestConfig<any>, authentication?: boolean) => Promise<AxiosResponse>;
    /**
     * @throws {Error|ApiAuthError|ApiError}
     */
    postAdv: (url: string, data: any, options?: AxiosRequestConfig<any>, authentication?: boolean) => Promise<ApiAdvancedResponse>;
    /**
     * @throws {Error|ApiAuthError|ApiError}
     */
    post: (url: string, data: any, options?: AxiosRequestConfig<any>, authentication?: boolean) => Promise<AxiosResponse>;
    /**
     * @throws {Error|ApiAuthError|ApiError}
     */
    postForm: (url: string, data: any, options?: AxiosRequestConfig<any>, authentication?: boolean) => Promise<AxiosResponse>;
    /**
     * @throws {Error|ApiAuthError|ApiError}
     */
    put: (url: string, data: any, options?: AxiosRequestConfig<any>, authentication?: boolean) => Promise<AxiosResponse>;
    /**
     * @throws {Error|ApiAuthError|ApiError}
     */
    delete: (url: string, options?: AxiosRequestConfig<any>, authentication?: boolean) => Promise<AxiosResponse>;
    /**
     * @throws {Error|ApiAuthError|ApiError}
     */
    postDownload: (url: string, data: any, options?: AxiosRequestConfig<any>, authentication?: boolean) => Promise<void>;
    /**
     * @throws {Error|ApiAuthError|ApiError}
     */
    getDownload: (url: string, options?: AxiosRequestConfig<any>, authentication?: boolean) => Promise<void>;
    private doBrowserDownload;
    /**
     * @throws {Error|ApiAuthError|ApiError}
     */
    upload: (url: string, files: Array<File>, options?: AxiosRequestConfig<any>, authentication?: boolean) => Promise<AxiosResponse<any, any>>;
}

export { ApiAdvancedResponse, ApiAuthError, ApiConfig, ApiError, ApiRequestQueueItem, ApiService as default };
