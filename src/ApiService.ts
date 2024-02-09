import ApiError from "./ApiError";
import ApiAuthError from "./ApiAuthError";
// eslint-disable-next-line
import ApiConfig from "./ApiConfig";
import ApiRequestQueueItem from "./ApiRequestQueueItem";
import ApiAdvancedResponse from "./ApiAdvancedResponse";
import axios, {AxiosError} from "axios";
import {trimEnd,isEmpty} from "lodash"

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

        return trimEnd( this.config.baseUrl, '/' ) + '/' + cleanUrlPath + append;
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
    private apiErrorCatch = async (e: Error | AxiosError): Promise<void> => {
        if (e instanceof AxiosError) {
            //if it is a blob (file download)
            if (e.request.responseType === 'blob' && e.response?.data instanceof Blob && e.response?.data.type && e.response?.data.type.toLowerCase().indexOf('json') != -1) {
                let resolvedResponse = JSON.parse(await e.response?.data.text());
                if (resolvedResponse.message) {
                    throw new ApiError(resolvedResponse.message, resolvedResponse.status, resolvedResponse.data);
                }
            }

            //api returned a structured error
            if (e.response && e.response.data && e.response.data.message) {
                throw new ApiError(e.response.data.message, e.response.status, e.response.data);
            }

            //clean up 400,404,500 etc
            else if (e.response && e.response.status) {
                throw new ApiError(e.message, e.response.status);
            }
        }

        //axios error - presumably a network error
        throw e
    }


    cancelRequest = async (requestId:string = ''):Promise<void> => {
        await this.cancelRequests([requestId])
    }

    cancelRequests = async (requestIds:string[] = []):Promise<void> => {
        //console.log('cancel requests')
        //console.log(requestIds)
        for (let i in requestIds) {
            let requestId = requestIds[i]
            if (this.requestsQueue[requestId]) {
                if ( this.requestsQueue[requestId] && this.requestsQueue[requestId].abortController instanceof AbortController) {
                    this.requestsQueue[requestId].abortController.abort()
                }
                delete this.requestsQueue[requestId]
            }
        }
    }

    cancelAll = async ():Promise<void> => {
        await this.cancelRequests(Object.keys(this.requestsQueue))
    }


    /**
     * @throws {Error|ApiAuthError|ApiError}
     */
    getAdv = async (
        url:string,
        options:AxiosRequestConfig<any> = {},
        authentication:boolean = true
    ):Promise<ApiAdvancedResponse> => {
        let requestQueueItem:ApiRequestQueueItem = await this.createRequest(url, null, options, authentication)
        try {
            let responsePromise:Promise<AxiosResponse<any, any>> = this.axiosInstance.get(requestQueueItem.url, requestQueueItem.axiosConfig)
            return new ApiAdvancedResponse(requestQueueItem, responsePromise);
        }
        catch(e:any) {
            if(e instanceof Error || e instanceof AxiosError) {
                await this.apiErrorCatch(e)
            }
            throw e
        }
    }


    /**
     * @throws {Error|ApiAuthError|ApiError}
     */
    get = async (
        url:string,
        options:AxiosRequestConfig<any> = {},
        authentication:boolean = true
    ):Promise<AxiosResponse> => {
        let advResponse:ApiAdvancedResponse = await this.getAdv(url, options, authentication)
        return advResponse.response;
    }

    /**
     * @throws {Error|ApiAuthError|ApiError}
     */
    postAdv = async (
        url:string,
        data:any,
        options:AxiosRequestConfig<any> = {},
        authentication:boolean = true
    ):Promise<ApiAdvancedResponse> => {
        let requestQueueItem = await this.createRequest(url, data, options, authentication)
        try {
            let responsePromise = this.axiosInstance.post(requestQueueItem.url, data, requestQueueItem.axiosConfig);
            return new ApiAdvancedResponse(requestQueueItem, responsePromise);
        }
        catch(e:any) {
            if(e instanceof Error || e instanceof AxiosError) {
                await this.apiErrorCatch(e)
            }
            throw e
        }
    }

    /**
     * @throws {Error|ApiAuthError|ApiError}
     */
    post = async (
        url:string,
        data:any,
        options:AxiosRequestConfig<any> = {},
        authentication:boolean = true
    ):Promise<AxiosResponse> => {
        let advResponse = await this.postAdv(url, data, options, authentication)
        return advResponse.response;
    }

    /**
     * @throws {Error|ApiAuthError|ApiError}
     */
    postForm = async (
        url:string,
        data:any,
        options:AxiosRequestConfig<any> = {},
        authentication:boolean = true
    ):Promise<AxiosResponse> => {
        if (isEmpty(options.headers)) {
            options.headers = {};
        }
        options.headers['Content-Type'] = 'multipart/form-data';
        let requestQueueItem = await this.createRequest(url, data, options, authentication)
        try {
            return this.axiosInstance.post(requestQueueItem.url, data, requestQueueItem.axiosConfig);
        }
        catch(e:any) {
            if(e instanceof Error || e instanceof AxiosError) {
                await this.apiErrorCatch(e)
            }
            throw e
        }
    }

    /**
     * @throws {Error|ApiAuthError|ApiError}
     */
    put = async (
        url:string,
        data:any,
        options:AxiosRequestConfig<any> = {},
        authentication:boolean = true
    ):Promise<AxiosResponse> => {
        let requestQueueItem = await this.createRequest(url, data, options, authentication)
        try {
            return this.axiosInstance.put(requestQueueItem.url, data, requestQueueItem.axiosConfig);
        }
        catch(e:any) {
            if(e instanceof Error || e instanceof AxiosError) {
                await this.apiErrorCatch(e)
            }
            throw e
        }
    }

    /**
     * @throws {Error|ApiAuthError|ApiError}
     */
    delete = async (
        url:string,
        options:AxiosRequestConfig<any> = {},
        authentication:boolean = true
    ):Promise<AxiosResponse> => {
        let requestQueueItem = await this.createRequest(url, null, options, authentication)
        try {
            return this.axiosInstance.delete(requestQueueItem.url, requestQueueItem.axiosConfig);
        }
        catch(e:any) {
            if(e instanceof Error || e instanceof AxiosError) {
                await this.apiErrorCatch(e)
            }
            throw e
        }
    }


    /**
     * @throws {Error|ApiAuthError|ApiError}
     */
    postDownload = async (
        url:string,
        data:any,
        options:AxiosRequestConfig<any> = {},
        authentication:boolean = true
    ):Promise<void> => {
        let fullOptions:AxiosRequestConfig = {
            ...options,
            responseType: 'blob'
        };

        let requestQueueItem = await this.createRequest(url, data, fullOptions, authentication)

        try {
            let response:AxiosResponse  = await this.axiosInstance.post(requestQueueItem.url, data, requestQueueItem.axiosConfig)
            this.doBrowserDownload(response)

        }
        catch(e:any) {
            if(e instanceof Error || e instanceof AxiosError) {
                await this.apiErrorCatch(e)
            }
            throw e
        }

    }


    /**
     * @throws {Error|ApiAuthError|ApiError}
     */
    getDownload = async (
        url:string,
        options:AxiosRequestConfig<any> = {},
        authentication:boolean = true
    ):Promise<void>  => {
        let fullOptions:AxiosRequestConfig<any> = {
            ...options,
            responseType: 'blob'
        };
        let requestQueueItem = await this.createRequest(url, null, fullOptions, authentication)

        try {
            let response = await this.axiosInstance.get(requestQueueItem.url, requestQueueItem.axiosConfig)
            this.doBrowserDownload(response)
        }
        catch(e:any) {
            if(e instanceof Error || e instanceof AxiosError) {
                await this.apiErrorCatch(e)
            }
            throw e
        }
    }

    private doBrowserDownload = (response:AxiosResponse):void => {
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
        url:string,
        files:Array<File>,
        options:AxiosRequestConfig<any> = {},
        authentication:boolean = true
    ) => {

        let formData = new FormData();
        for (let i = 0; i < files.length; i++) {
            formData.append('file[' + i + ']', files[i]);
        }

        let requestQueueItem = await this.createRequest(url, formData, options, authentication)

        try {
            return this.axiosInstance.post(requestQueueItem.url, formData, requestQueueItem.axiosConfig)
        }
        catch(e:any) {
            if(e instanceof Error || e instanceof AxiosError) {
                await this.apiErrorCatch(e)
            }
            throw e
        }
    }

}

export default ApiService;
export {ApiConfig, ApiError, ApiAuthError, ApiAdvancedResponse, ApiRequestQueueItem}
