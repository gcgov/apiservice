import * as lodash from 'lodash';
import { EntityTable } from 'dexie';
import { Ref } from 'vue';

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

declare class UiStateError {
    error: boolean;
    errorCode: string | number;
    errorMessage: string;
    reset: () => void;
}
declare class UiState {
    loading: boolean;
    loadDialog: boolean;
    loadingError: UiStateError;
}
interface IServerDataTableSortGroup {
    key: string;
    order?: boolean | 'asc' | 'desc';
}
type TServerDataTableFilters = Record<string, string | string[] | undefined | null>;
interface IServerDataTableOptions {
    filters?: TServerDataTableFilters | undefined;
    page?: number | undefined;
    itemsPerPage?: number | undefined;
    sortBy?: IServerDataTableSortGroup[] | undefined;
    groupBy?: IServerDataTableSortGroup[] | undefined;
}
declare class ServerDataTable<T extends {
    _id: string;
}> {
    ui: Ref<UiState>;
    private localStorageKey;
    private baseUrl;
    private appApiService;
    private table;
    itemsPerPage: Ref<number>;
    page: Ref<number>;
    totalItems: Ref<number>;
    sortBy: Ref<IServerDataTableSortGroup[]>;
    groupBy: Ref<IServerDataTableSortGroup[]>;
    filters: Ref<TServerDataTableFilters | undefined>;
    private defaultItemsPerPage;
    private defaultPage;
    private defaultSortBy;
    private defaultGroupBy;
    private defaultFilters;
    private tableIndexes;
    private currentTableIndexKey;
    currentItems: Ref<T[]>;
    /**
     *
     * @param id
     * @param baseUrl
     * @param appApiService
     * @param table
     * @param defaultOptions
     * @param loadFromStorage optional - false by default. If true, will load current values from storage if available and use the values from defaultOptions if not.
     */
    constructor(id: string, baseUrl: string, appApiService: ApiService, table: EntityTable<T, '_id'>, defaultOptions?: IServerDataTableOptions | undefined, loadFromStorage?: boolean);
    log: (message: string) => void;
    updateValues: (options: IServerDataTableOptions) => Promise<void>;
    updateValuesDebounced: lodash.DebouncedFunc<(options: IServerDataTableOptions) => Promise<void>>;
    getForTable: (forceFromServer?: boolean) => Promise<Array<T>>;
    private getForTableFromDb;
    updateFilters: (filters: TServerDataTableFilters | undefined) => Promise<void>;
    updateFiltersDebounced: lodash.DebouncedFunc<(filters: TServerDataTableFilters | undefined) => Promise<void>>;
    reset: () => Promise<void>;
    resetFilters: () => Promise<void>;
    getUrl: () => string;
    getIndexKey: () => string;
    resetIndexing: () => void;
    private persistInStorage;
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
    getAllPaged: <T>(url: string, options?: RequestInit, authentication?: boolean, page?: number, itemsPerPage?: number, collection?: Array<T>) => Promise<Array<T>>;
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

export { ApiAdvancedResponse, ApiAuthError, ApiConfig, ApiError, ApiRequestQueueItem, type IServerDataTableOptions, type IServerDataTableSortGroup, ServerDataTable, type TServerDataTableFilters, ApiService as default };
