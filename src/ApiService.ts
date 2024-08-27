import ApiError from "./ApiError";
import ApiAuthError from "./ApiAuthError";
// eslint-disable-next-line
import ApiConfig from "./ApiConfig";
import ApiRequestQueueItem from "./ApiRequestQueueItem";
import ApiAdvancedResponse from "./ApiAdvancedResponse";
import {trimEnd, isEmpty, isArray, isNumber} from "lodash"

class ApiService {

    private readonly serviceId: string = ''

    public config: ApiConfig

    private requestsQueue: { [key: string]: ApiRequestQueueItem } = {}

    /**
     *
     * @param {ApiConfig} apiConfig
     */
    constructor(apiConfig: ApiConfig) {
        this.serviceId = crypto.randomUUID()
        this.config = apiConfig

        console.log('Constructed ApiService #' + this.serviceId + ' for base url ' + apiConfig.baseUrl);
    }

    private createRequest = async (
        method: string,
        urlPath: string,
        data: any = null,
        options: RequestInit = {},
        authentication: boolean = true
    ): Promise<ApiRequestQueueItem> => {

        const fullUrl: string = this.buildUrl(urlPath)

        const abortController: AbortController = new AbortController()

        const requestId: string = crypto.randomUUID()

        const config: RequestInit = await this.buildConfig(method, options, data, abortController, authentication, requestId)

        this.requestsQueue[requestId] = new ApiRequestQueueItem(requestId, fullUrl, data, config, abortController, authentication)

        return this.requestsQueue[requestId]
    }

    public buildUrl(urlPath: string): string {
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

    public buildConfig = async (
        method: string = 'GET',
        options: RequestInit = {},
        data: any = null,
        abortController: AbortController | null = null,
        authentication: boolean = true,
        requestId: string = crypto.randomUUID()
    ): Promise<RequestInit> => {


        let config = {
            ...options
        };

        //add method
        config.method = method

        //add abort handler
        if (abortController instanceof AbortController) {
            config.signal = abortController.signal
        }

        //standardize headers into Headers object
        if(config.headers==undefined) {
            config.headers = new Headers();
        }
        else if(!(config.headers instanceof Headers)) {
            const requestHeaders =  new Headers();
            if( isArray(config.headers) ) {
                for(let i=0; i<config.headers.length; i++) {
                    requestHeaders.set( config.headers[i][0], config.headers[i][1] )
                }
            }
            else {
                for(const key in config.headers) {
                    requestHeaders.set( key, config.headers[key] )
                }
            }
            config.headers = requestHeaders
        }

        config.headers.set('X-Request-Id', requestId)

        //add auth
        if (authentication) {
            //get access token
            let accessToken = await this.config.getAccessTokenFn();
            if (accessToken === '' || accessToken === null) {
                console.log('empty access token');
                throw new ApiAuthError('Authentication failed', 401)
            }

            config.headers.set('Authorization', 'Bearer ' + accessToken)
        }

        //add data to body
        if(data instanceof FormData) {
            config.body = data
        }
        else if(data!==null) {
            config.body = JSON.stringify( data )
        }

        return config;
    }

    /**
     * Standardize error reporting up the stack to our ApiError
     * @param {Error} e
     * @throws {Error|ApiAuthError|ApiError}
     */
    private apiErrorCatch = async (e: any): Promise<void> => {
        const response = e?.response
        const request = e?.request

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

        throw new ApiError('Unrecoverable error in local API service')
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

    cancelRequest = async (requestId: string = ''): Promise<void> => {
        await this.cancelRequests([requestId])
    }


    cancelAll = async (): Promise<void> => {
        await this.cancelRequests(Object.keys(this.requestsQueue))
    }


    /**
     * @throws {Error|ApiAuthError|ApiError}
     */
    getAdv = async (
        url: string,
        options: RequestInit = {},
        authentication: boolean = true
    ): Promise<ApiAdvancedResponse> => {
        const requestQueueItem: ApiRequestQueueItem = await this.createRequest('GET', url, null, options, authentication)
        const responsePromise:Promise<Response> = fetch(requestQueueItem.url, requestQueueItem.config).then((response)=>{

            return response
        }).catch(async (e) => {
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
        options: RequestInit = {},
        authentication: boolean = true
    ): Promise<Response> => {
        const advResponse: ApiAdvancedResponse = await this.getAdv(url, options, authentication)
        return advResponse.response;
    }

    /**
     * @throws {Error|ApiAuthError|ApiError}
     */
    postAdv = async (
        url: string,
        data: any,
        options: RequestInit = {},
        authentication: boolean = true
    ): Promise<ApiAdvancedResponse> => {
        let requestQueueItem = await this.createRequest('POST', url, data, options, authentication)
        let responsePromise: Promise<Response> = fetch(requestQueueItem.url, requestQueueItem.config).catch(async (e) => {
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
        options: RequestInit = {},
        authentication: boolean = true
    ): Promise<Response> => {
        let advResponse = await this.postAdv(url, data, options, authentication)
        return advResponse.response;
    }

    /**
     * @throws {Error|ApiAuthError|ApiError}
     */
    postForm = async (
        url: string,
        data: any,
        options: RequestInit = {},
        authentication: boolean = true
    ): Promise<Response> => {
        let requestQueueItem = await this.createRequest('POST', url, data, options, authentication)
        //@ts-ignore - requestQueueItem.config.headers is always set to be a Headers() object
        requestQueueItem.config.headers.set('Content-Type', 'multipart/form-data')
        return fetch(requestQueueItem.url, requestQueueItem.config).catch(async (e) => {
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
        options: RequestInit = {},
        authentication: boolean = true
    ): Promise<Response> => {
        let requestQueueItem = await this.createRequest('PUT', url, data, options, authentication)
        return fetch(requestQueueItem.url, requestQueueItem.config).catch(async (e) => {
            await this.apiErrorCatch(e);
            throw e;
        });
    }

    /**
     * @throws {Error|ApiAuthError|ApiError}
     */
    delete = async (
        url: string,
        options: RequestInit = {},
        authentication: boolean = true
    ): Promise<Response> => {
        let requestQueueItem = await this.createRequest('DELETE', url, null, options, authentication)
        return fetch(requestQueueItem.url, requestQueueItem.config).catch(async (e) => {
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
        options: RequestInit = {},
        authentication: boolean = true
    ): Promise<void> => {
        /*let fullOptions: RequestInit = {
            ...options,
            responseType: 'blob'
        };*/

        let requestQueueItem = await this.createRequest('POST', url, data, options, authentication)
        let response: Response = await fetch(requestQueueItem.url, requestQueueItem.config).catch(async (e) => {
            await this.apiErrorCatch(e);
            throw e;
        })
        await this.doBrowserDownload(response)
    }


    /**
     * @throws {Error|ApiAuthError|ApiError}
     */
    getDownload = async (
        url: string,
        options: RequestInit = {},
        authentication: boolean = true
    ): Promise<void> => {
        /*let fullOptions: RequestInit = {
            ...options,
            responseType: 'blob'
        };*/
        let requestQueueItem = await this.createRequest('GET', url, null, options, authentication)
        let response = await fetch(requestQueueItem.url, requestQueueItem.config).catch(async (e) => {
            await this.apiErrorCatch(e);
            throw e;
        })
        await this.doBrowserDownload(response)
    }

    private doBrowserDownload = async (response: Response): Promise<void> => {
        const blobContent = await response.blob()
        let downloadUrl = window.URL.createObjectURL( blobContent );
        let link = document.createElement('a');
        link.href = downloadUrl;
        let fileName = 'file';
        let headerValue = response.headers.get('content-disposition')
        if (headerValue) {
            let fileNameMatch = headerValue.match(/filename=(.+)/);
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
        options: RequestInit = {},
        authentication: boolean = true
    ) => {

        let formData = new FormData();
        for (let i = 0; i < files.length; i++) {
            formData.append('file[' + i + ']', files[i]);
        }

        let requestQueueItem = await this.createRequest('POST', url, formData, options, authentication)
        return fetch(requestQueueItem.url, requestQueueItem.config).catch(async (e) => {
            await this.apiErrorCatch(e);
            throw e;
        })

    }

}

export default ApiService;
export {ApiConfig, ApiError, ApiAuthError, ApiAdvancedResponse, ApiRequestQueueItem}
