import ApiError from "./ApiError";
import ApiAuthError from "./ApiAuthError";
// eslint-disable-next-line
import ApiConfig from "./ApiConfig";
import ApiRequestQueueItem from "./ApiRequestQueueItem";
import ApiAdvancedResponse from "./ApiAdvancedResponse";
import axios    from "axios";
import _        from "lodash"
// eslint-disable-next-line
import {AxiosInstance, AxiosResponse, AxiosRequestConfig} from "axios";

class ApiService {

	/** @type {String} */
	#serviceId = ''

	/** @type {String} */
	#baseUrl = ''

	/** @type {String} */
	#baseUrlParams = ''

	/** @type {Boolean} */
	#useAuthentication = false

	/** @type {function(): Promise<string>} */
	#getBearerTokenFn = async()=>{return ''}

	/** @type {Object} */
	#requestsQueue = {}

	/** @type {AxiosInstance} */
	#axiosInstance = null

	/**
	 *
	 * @param {ApiConfig} apiConfig
	 */
	constructor( apiConfig ) {
		this.#serviceId = crypto.randomUUID()
		this.#baseUrl = apiConfig.baseUrl
		this.#baseUrlParams = apiConfig.baseUrlParams
		this.#useAuthentication = apiConfig.useAuthentication
		this.#getBearerTokenFn = apiConfig.getBearerTokenFn

		//axios configuration
		this.#axiosInstance =  axios.create();

		//intercept responses to keep the request queue up to date
		this.#axiosInstance.interceptors.response.use( (response) => {
			// Any status code that lie within the range of 2xx cause this function to trigger
			if( response.config?.headers?.['X-Request-Id']) {
				delete this.#requestsQueue[ response.config?.headers?.['X-Request-Id'] ]
			}
			return response;
		},  (error) => {
			// Any status codes that falls outside the range of 2xx cause this function to trigger
			if( error.response?.config?.headers?.['X-Request-Id']) {
				delete this.#requestsQueue[ error.response?.config?.headers?.['X-Request-Id'] ]
			}
			return Promise.reject(error);
		});


		console.log( 'Constructed ApiService #'+this.#serviceId+' for base url '+apiConfig.baseUrl );
	}

	#createRequest = async ( urlPath, data=null, options={}, authentication=true ) => {
		let fullUrl = this.#buildUrl( urlPath )
		let abortController = new AbortController()
		let axiosConfig = await this.#buildAxiosConfig( options, abortController, authentication )
		let requestQueueItem = new ApiRequestQueueItem( axiosConfig.headers['X-Request-Id'], fullUrl, data, axiosConfig, abortController, authentication )

		this.#requestsQueue[ requestQueueItem.id ] = requestQueueItem

		return this.#requestsQueue[ requestQueueItem.id ]
	}

	#buildUrl( urlPath ) {
		if( urlPath.substr( 0, 4 )==='http' ) {
			return urlPath;
		}

		let cleanUrlPath = urlPath.replace( /^\/+|\/+$/g, '' );
		let append       = '';
		if( this.#baseUrlParams!=='' ) {
			append = '?';
			if( cleanUrlPath.indexOf( '?' )> -1 ) {
				append = '&';
			}
			append += this.#baseUrlParams;
		}

		return this.#baseUrl + '/' + cleanUrlPath + append;
	}

	/**
	 * @param {AxiosRequestConfig<any>} options
	 * @param {AbortController} abortController
	 * @param {Boolean} authentication
	 * @throws {ApiAuthError, ApiError}
	 */
	#buildAxiosConfig = async ( options = {}, abortController=null, authentication = true ) => {
		let config = {
			...options
		};

		if(abortController instanceof AbortController ) {
			config.signal = abortController.signal
		}

		if( typeof ( config.headers )==='undefined' ) {
			config.headers = {};
		}

		config.headers['X-Request-Id'] = crypto.randomUUID()


		if(authentication) {
			//get access token
			let accessToken = await this.#getBearerTokenFn();
			if( accessToken==='' || accessToken===null ) {
				console.log( 'empty access token' );
				throw new ApiAuthError( 'Authentication failed', 401 );
			}

			if( typeof ( config.headers )==='undefined' ) {
				config.headers = {};
			}
			config.headers[ 'Authorization' ] = 'Bearer ' + accessToken;
		}

		return config;
	}

	/**
	 * Standardize error reporting up the stack to our ApiError
	 * @param {Error} e
	 * @throws {ApiError}
	 */
	#apiErrorCatch = async ( e ) => {
		//if it is a blob (file download)
		if( e.request.responseType==='blob' && e.response.data instanceof Blob && e.response.data.type && e.response.data.type.toLowerCase().indexOf( 'json' )!= -1 ) {
			let resolvedResponse = JSON.parse( await e.response.data.text() );
			if( resolvedResponse.message ) {
				throw new ApiError( resolvedResponse.message, resolvedResponse.status, resolvedResponse.data );
			}
		}

		//api returned a structured error
		if( e.response && e.response.data && e.response.data.data ) {
			throw new ApiError( e.response.data.message, e.response.status, e.response.data.data );
		}

		//clean up 400,404,500 etc
		else if( e.response && e.response.status ) {
			throw new ApiError( e.message, e.response.status );
		}

		//axios error - presumably a network error
		else {
			throw e
		}
	}


	cancelRequest = async ( requestId='' ) => {
		await this.cancelRequests([ requestId ])
	}

	cancelRequests = async ( requestIds=[] ) => {
		//console.log('cancel requests')
		//console.log(requestIds)
		for(let i in requestIds) {
			let requestId = requestIds[i]
			if( this.#requestsQueue[requestId]) {
				if(this.#requestsQueue[ requestId ]?.abortController instanceof AbortController) {
					this.#requestsQueue[ requestId ].abortController.abort()
				}
				delete this.#requestsQueue[ requestId ]
			}
		}
	}

	cancelAll = async () => {
		await this.cancelRequests( Object.keys(this.#requestsQueue) )
	}


	/**
	 *
	 * @param {String} url
	 * @param {AxiosRequestConfig<any>} options
	 * @param {Boolean} authentication
	 * @returns ApiAdvancedResponse
	 * @throws {ApiAuthError, ApiError}
	 */
	getAdv  = async ( url, options = {}, authentication = true ) => {
		let requestQueueItem = await this.#createRequest( url, null, options, authentication )
		let responsePromise = this.#axiosInstance.get( requestQueueItem.url, requestQueueItem.axiosConfig ).catch( await this.#apiErrorCatch )
		return new ApiAdvancedResponse( requestQueueItem, responsePromise );
	}


	/**
	 *
	 * @param {String} url
	 * @param {AxiosRequestConfig<any>} options
	 * @param {Boolean} authentication
	 * @returns {Promise<AxiosResponse<any>>}
	 * @throws {ApiAuthError, ApiError}
	 */
	get  = async ( url, options = {}, authentication = true ) => {
		let advResponse = await this.getAdv( url, options, authentication )
		return advResponse.response;
	}

	/**
	 *
	 * @param {String} url
	 * @param data
	 * @param {AxiosRequestConfig<any>} options
	 * @param {Boolean} authentication
	 * @returns {ApiAdvancedResponse}
	 * @throws {ApiAuthError, ApiError}
	 */
	postAdv = async( url, data, options = {}, authentication = true ) => {
		let requestQueueItem = await this.#createRequest( url, data, options, authentication )
		let responsePromise = this.#axiosInstance.post( requestQueueItem.url, data, requestQueueItem.axiosConfig ).catch( await this.#apiErrorCatch );
		return new ApiAdvancedResponse( requestQueueItem, responsePromise );
	}

	/**
	 *
	 * @param {String} url
	 * @param data
	 * @param {AxiosRequestConfig<any>} options
	 * @param {Boolean} authentication
	 * @returns {Promise<AxiosResponse<any>>}
	 * @throws {ApiAuthError, ApiError}
	 */
	post = async( url, data, options = {}, authentication = true ) => {
		let advResponse = await this.postAdv( url, data, options, authentication )
		return advResponse.response;
	}

	/**
	 *
	 * @param {String} url
	 * @param data
	 * @param {AxiosRequestConfig<any>} options
	 * @param {Boolean} authentication
	 * @returns {Promise<AxiosResponse<any>>}
	 * @throws {ApiAuthError, ApiError}
	 */
	postForm = async ( url, data, options = {}, authentication = true )    => {
		if( _.isEmpty( options.headers ) ) {
			options.headers = {};
		}
		options.headers[ 'Content-Type' ] = 'multipart/form-data';
		let requestQueueItem = await this.#createRequest( url, data, options, authentication )
		return this.#axiosInstance.post( requestQueueItem.url, data, requestQueueItem.axiosConfig ).catch( await this.#apiErrorCatch );
	}

	/**
	 *
	 * @param {String} url
	 * @param data
	 * @param {AxiosRequestConfig<any>} options
	 * @param {Boolean} authentication
	 * @returns {Promise<AxiosResponse<any>>}
	 * @throws {ApiAuthError, ApiError}
	 */
	put = async ( url, data, options = {}, authentication = true ) => {
		let requestQueueItem = await this.#createRequest( url, data, options, authentication )

		return this.#axiosInstance.put( requestQueueItem.url, data, requestQueueItem.axiosConfig ).catch( await this.#apiErrorCatch );
	}

	/**
	 *
	 * @param {String} url
	 * @param {AxiosRequestConfig<any>} options
	 * @param {Boolean} authentication
	 * @returns {Promise<AxiosResponse<any>>}
	 * @throws {ApiAuthError, ApiError}
	 */
	delete = async ( url, options = {}, authentication = true ) => {
		let requestQueueItem = await this.#createRequest( url, null, options, authentication )
		return this.#axiosInstance.delete( requestQueueItem.url, requestQueueItem.axiosConfig ).catch( await this.#apiErrorCatch );
	}


	/**
	 * @param {String} url
	 * @param data
	 * @param {AxiosRequestConfig<any>} options
	 * @param {Boolean} authentication
	 * @returns void
	 * @throws {ApiAuthError, ApiError}
	 */
	postDownload = async ( url, data, options = {}, authentication = true )    => {
		let fullOptions = {
			...options,
			responseType: 'blob'
		};

		let requestQueueItem = await this.#createRequest( url, data, fullOptions, authentication )

		let response = await this.#axiosInstance.post( requestQueueItem.url, data, requestQueueItem.axiosConfig ).catch( await this.#apiErrorCatch )

		if( response===null ) {
			throw new ApiError( 'Getting download failed', 0 );
		}

		this.#doBrowserDownload( response )
	}


	/**
	 * @param {String} url
	 * @param {AxiosRequestConfig<any>} options
	 * @param {Boolean} authentication
	 * @returns void
	 * @throws {ApiAuthError, ApiError}
	 */
	getDownload = async ( url, options = {}, authentication = true ) => {
		let fullOptions = {
			...options,
			responseType: 'blob'
		};
		let requestQueueItem = await this.#createRequest( url, null, fullOptions, authentication )

		let response = await this.#axiosInstance.get( requestQueueItem.url, requestQueueItem.axiosConfig ).catch( await this.#apiErrorCatch )

		if( response===null ) {
			throw new ApiError( 'Getting download failed', 0 );
		}

		this.#doBrowserDownload( response )
	}

	#doBrowserDownload = ( response ) => {
		let downloadUrl = window.URL.createObjectURL( new Blob( [ response.data ] ) );
		let link        = document.createElement( 'a' );
		link.href       = downloadUrl;
		let fileName    = 'file';
		if( response.headers[ 'content-disposition' ] ) {
			let fileNameMatch = response.headers[ 'content-disposition' ].match( /filename=(.+)/ );
			if( fileNameMatch && fileNameMatch.length===2 ) {
				fileName = fileNameMatch[ 1 ].replaceAll( /["']/gi, '' );
			}
			else if( fileNameMatch && fileNameMatch.length===1 ) {
				fileName = fileNameMatch[ 0 ].replaceAll( /["']/gi, '' );
			}
		}
		link.setAttribute( 'download', fileName );
		document.body.appendChild( link );
		link.click();
		link.remove();
	}

	/**
	 * @param {String} url
	 * @param {Array} files
	 * @param {AxiosRequestConfig<any>} options
	 * @param {Boolean} authentication
	 * @returns {Promise<AxiosResponse<any>>}
	 * @throws {ApiAuthError, ApiError}
	 */
	upload = async ( url, files, options={}, authentication = true ) => {

		let formData = new FormData();
		for( let i = 0; i<files.length; i++ ) {
			formData.append( 'file[' + i + ']', files[ i ] );
		}

		let requestQueueItem = await this.#createRequest( url, formData, options, authentication )

		return this.#axiosInstance.post( requestQueueItem.url, formData, requestQueueItem.axiosConfig ).catch( await this.#apiErrorCatch );

	}

}

export default ApiService;
export {ApiConfig,ApiError,ApiAuthError,ApiAdvancedResponse,ApiRequestQueueItem}
