import ApiError from "./ApiError";
import ApiAuthError from "./ApiAuthError";
// eslint-disable-next-line
import ApiConfig from "./ApiConfig";
import ApiRequestQueueItem from "./ApiRequestQueueItem";
import ApiAdvancedResponse from "./ApiAdvancedResponse";
import axios, {AxiosError} from "axios";
import {trimEnd, isEmpty} from "lodash"

// eslint-disable-next-line
import {AxiosInstance, AxiosResponse, AxiosRequestConfig} from "axios";

class ApiService {

    private serviceId: string = ''

    private config: ApiConfig

    private requestsQueue: { [key: string]: ApiRequestQueueItem } = {}

    private axiosInstance: AxiosInstance

    /**
     *
     * @param {ApiConfig} apiConfig
     */
    constructor(apiConfig: ApiConfig) {
        this.serviceId = crypto.randomUUID()
        this.config = apiConfig
        //axios configuration
        this.axiosInstance = axios.create();

        //intercept responses to keep the request queue up to date
        this.axiosInstance.interceptors.response.use((response) => {
            // Any status code that lie within the range of 2xx cause this function to trigger
            if (response.config?.headers?.['X-Request-Id']) {
                delete this.requestsQueue[response.config?.headers?.['X-Request-Id']]
            }
            return response;
        }, (error) => {
            // Any status codes that falls outside the range of 2xx cause this function to trigger
            if (error.response?.config?.headers?.['X-Request-Id']) {
                delete this.requestsQueue[error.response?.config?.headers?.['X-Request-Id']]
            }
            return Promise.reject(error);
        });


        console.log('Constructed ApiService #' + this.serviceId + ' for base url ' + apiConfig.baseUrl);
    }

    private createRequest = async (
        urlPath: string,
        data: any = null,
        options: AxiosRequestConfig<any> = {},
        authentication: boolean = true
    ): Promise<ApiRequestQueueItem> => {

        const fullUrl: string = this.buildUrl(urlPath)

        const abortController: AbortController = new AbortController()

        const requestId: string = crypto.randomUUID()

        const axiosConfig: AxiosRequestConfig<any> = await this.buildAxiosConfig(options, abortController, authentication, requestId)

        this.requestsQueue[requestId] = new ApiRequestQueueItem(requestId, fullUrl, data, axiosConfig, abortController, authentication)

        return this.requestsQueue[requestId]
    }

    private buildUrl(urlPath: string): string {
        if (urlPath.substring(0, 4) === 'http') {
            return urlPath;
        }

        let cleanUrlPath = urlPath.replace(/^\/+|\/+$/g, '');
        let append = '';
        if (this.config.baseUrlParams !== '') {
            append = '?';
            if (cleanUrlPath.indexOf('?') > -1) {
                append = '&';
            }
            append += this.config.baseUrlParams;
        }

        return trimEnd(this.config.baseUrl, '/') + '/' + cleanUrlPath + append;
    }

    private buildAxiosConfig = async (
        options: AxiosRequestConfig<any> = {},
        abortController: AbortController | null = null,
        authentication: boolean = true,
        requestId: string = crypto.randomUUID()
    ): Promise<AxiosRequestConfig<any>> => {
        let config = {
            ...options
        };

        if (abortController instanceof AbortController) {
            config.signal = abortController.signal
        }

        if (typeof (config.headers) === 'undefined') {
            config.headers = {};
        }

        config.headers['X-Request-Id'] = requestId


        if (authentication) {
            //get access token
            let accessToken = await this.config.getAccessTokenFn();
            if (accessToken === '' || accessToken === null) {
                console.log('empty access token');
                throw new ApiAuthError('Authentication failed', 401);
            }

            if (typeof (config.headers) === 'undefined') {
                config.headers = {};
            }
            config.headers['Authorization'] = 'Bearer ' + accessToken;
        }

        return config;
    }

    /**
     * Standardize error reporting up the stack to our ApiError
     * @param {Error} e
     * @throws {Error|ApiAuthError|ApiError}
     */
    private apiErrorCatch = async (e: any): Promise<void> => {
        if (axios.isAxiosError(e)) {
            const response = e?.response
            const request = e?.request
            const config = e?.config //here we have access the config used to make the api call (we can make a retry using this conf)

            if (e.code === 'ERR_NETWORK') {
                throw new ApiError('Network connection problem', '1001')
            } else if (e.code === 'ERR_CANCELED') {
                throw new ApiError('Request cancelled', '1000')
            }

            //pretty error from API
            if (response && response.data && response.data.message) {
                throw new ApiError(response.data.message, response.status, response.data);
            }
            //standard 400, 404, 500, etc error
            else if (response && response.status) {
                throw new ApiError(e.message, response.status);
            }
            //if it is a blob (file download)
            else if (request && response && request.responseType === 'blob' && response.data instanceof Blob && response.data.type && response.data.type.toLowerCase().includes('json')) {
                let resolvedResponse = JSON.parse(await response.data.text());
                if (resolvedResponse.message && resolvedResponse.status && resolvedResponse.data) {
                    throw new ApiError(resolvedResponse.message, resolvedResponse.status, resolvedResponse.data);
                } else if (resolvedResponse.message && resolvedResponse.data) {
                    throw new ApiError(resolvedResponse.message, response.status, resolvedResponse.data);
                }
            }
        }
        else if( e instanceof Error ) {
            throw e
        }

        throw new ApiError('Unrecoverable error in local API service')
    }


    cancelRequest = async (requestId: string = ''): Promise<void> => {
        await this.cancelRequests([requestId])
    }

    cancelRequests = async (requestIds: string[] = []): Promise<void> => {
        //console.log('cancel requests')
        //console.log(requestIds)
        for (let i in requestIds) {
            let requestId = requestIds[i]
            if (this.requestsQueue[requestId]) {
                if (this.requestsQueue[requestId] && this.requestsQueue[requestId].abortController instanceof AbortController) {
                    this.requestsQueue[requestId].abortController.abort()
                }
                delete this.requestsQueue[requestId]
            }
        }
    }

    cancelAll = async (): Promise<void> => {
        await this.cancelRequests(Object.keys(this.requestsQueue))
    }


    /**
     * @throws {Error|ApiAuthError|ApiError}
     */
    getAdv = async (
        url: string,
        options: AxiosRequestConfig<any> = {},
        authentication: boolean = true
    ): Promise<ApiAdvancedResponse> => {
        let requestQueueItem: ApiRequestQueueItem = await this.createRequest(url, null, options, authentication)
        let responsePromise: Promise<AxiosResponse> = this.axiosInstance.get(requestQueueItem.url, requestQueueItem.axiosConfig).catch(async (e) => {
            await this.apiErrorCatch(e);
            throw e;
        })
        return new ApiAdvancedResponse(requestQueueItem, responsePromise);
    }


    /**
     * @throws {Error|ApiAuthError|ApiError}
     */
    get = async (
        url: string,
        options: AxiosRequestConfig<any> = {},
        authentication: boolean = true
    ): Promise<AxiosResponse> => {
        let advResponse: ApiAdvancedResponse = await this.getAdv(url, options, authentication)
        return advResponse.response;
    }

    /**
     * @throws {Error|ApiAuthError|ApiError}
     */
    postAdv = async (
        url: string,
        data: any,
        options: AxiosRequestConfig<any> = {},
        authentication: boolean = true
    ): Promise<ApiAdvancedResponse> => {
        let requestQueueItem = await this.createRequest(url, data, options, authentication)
        let responsePromise: Promise<AxiosResponse> = this.axiosInstance.post(requestQueueItem.url, data, requestQueueItem.axiosConfig).catch(async (e) => {
            await this.apiErrorCatch(e);
            throw e;
        });
        return new ApiAdvancedResponse(requestQueueItem, responsePromise);

    }

    /**
     * @throws {Error|ApiAuthError|ApiError}
     */
    post = async (
        url: string,
        data: any,
        options: AxiosRequestConfig<any> = {},
        authentication: boolean = true
    ): Promise<AxiosResponse> => {
        let advResponse = await this.postAdv(url, data, options, authentication)
        return advResponse.response;
    }

    /**
     * @throws {Error|ApiAuthError|ApiError}
     */
    postForm = async (
        url: string,
        data: any,
        options: AxiosRequestConfig<any> = {},
        authentication: boolean = true
    ): Promise<AxiosResponse> => {
        if (isEmpty(options.headers)) {
            options.headers = {};
        }
        options.headers['Content-Type'] = 'multipart/form-data';
        let requestQueueItem = await this.createRequest(url, data, options, authentication)
        return this.axiosInstance.post(requestQueueItem.url, data, requestQueueItem.axiosConfig).catch(async (e) => {
            await this.apiErrorCatch(e);
            throw e;
        });

    }

    /**
     * @throws {Error|ApiAuthError|ApiError}
     */
    put = async (
        url: string,
        data: any,
        options: AxiosRequestConfig<any> = {},
        authentication: boolean = true
    ): Promise<AxiosResponse> => {
        let requestQueueItem = await this.createRequest(url, data, options, authentication)
        return this.axiosInstance.put(requestQueueItem.url, data, requestQueueItem.axiosConfig).catch(async (e) => {
            await this.apiErrorCatch(e);
            throw e;
        });
    }

    /**
     * @throws {Error|ApiAuthError|ApiError}
     */
    delete = async (
        url: string,
        options: AxiosRequestConfig<any> = {},
        authentication: boolean = true
    ): Promise<AxiosResponse> => {
        let requestQueueItem = await this.createRequest(url, null, options, authentication)
        return this.axiosInstance.delete(requestQueueItem.url, requestQueueItem.axiosConfig).catch(async (e) => {
            await this.apiErrorCatch(e);
            throw e;
        });
    }


    /**
     * @throws {Error|ApiAuthError|ApiError}
     */
    postDownload = async (
        url: string,
        data: any,
        options: AxiosRequestConfig<any> = {},
        authentication: boolean = true
    ): Promise<void> => {
        let fullOptions: AxiosRequestConfig = {
            ...options,
            responseType: 'blob'
        };

        let requestQueueItem = await this.createRequest(url, data, fullOptions, authentication)
        let response: AxiosResponse = await this.axiosInstance.post(requestQueueItem.url, data, requestQueueItem.axiosConfig).catch(async (e) => {
            await this.apiErrorCatch(e);
            throw e;
        })
        this.doBrowserDownload(response)
    }


    /**
     * @throws {Error|ApiAuthError|ApiError}
     */
    getDownload = async (
        url: string,
        options: AxiosRequestConfig<any> = {},
        authentication: boolean = true
    ): Promise<void> => {
        let fullOptions: AxiosRequestConfig<any> = {
            ...options,
            responseType: 'blob'
        };
        let requestQueueItem = await this.createRequest(url, null, fullOptions, authentication)
        let response = await this.axiosInstance.get(requestQueueItem.url, requestQueueItem.axiosConfig).catch(async (e) => {
            await this.apiErrorCatch(e);
            throw e;
        })
        this.doBrowserDownload(response)
    }

    private doBrowserDownload = (response: AxiosResponse): void => {
        let downloadUrl = window.URL.createObjectURL(new Blob([response.data]));
        let link = document.createElement('a');
        link.href = downloadUrl;
        let fileName = 'file';
        if (response.headers['content-disposition']) {
            let fileNameMatch = response.headers['content-disposition'].match(/filename=(.+)/);
            if (fileNameMatch && fileNameMatch.length === 2) {
                fileName = fileNameMatch[1].replaceAll(/["']/gi, '');
            } else if (fileNameMatch && fileNameMatch.length === 1) {
                fileName = fileNameMatch[0].replaceAll(/["']/gi, '');
            }
        }
        link.setAttribute('download', fileName);
        document.body.appendChild(link);
        link.click();
        link.remove();
    }

    /**
     * @throws {Error|ApiAuthError|ApiError}
     */
    upload = async (
        url: string,
        files: Array<File>,
        options: AxiosRequestConfig<any> = {},
        authentication: boolean = true
    ) => {

        let formData = new FormData();
        for (let i = 0; i < files.length; i++) {
            formData.append('file[' + i + ']', files[i]);
        }

        let requestQueueItem = await this.createRequest(url, formData, options, authentication)
        return this.axiosInstance.post(requestQueueItem.url, formData, requestQueueItem.axiosConfig).catch(async (e) => {
            await this.apiErrorCatch(e);
            throw e;
        })

    }

}

export default ApiService;
export {ApiConfig, ApiError, ApiAuthError, ApiAdvancedResponse, ApiRequestQueueItem}
