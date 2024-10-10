// src/ApiError.ts
var ApiError = class _ApiError extends Error {
  code = 0;
  data = {};
  guid = "";
  constructor(message, code = 0, data = {}, guid = "") {
    super(message);
    this.name = this.constructor.name;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, _ApiError);
    }
    this.code = code;
    this.data = data;
    this.guid = guid;
  }
};
var ApiError_default = ApiError;

// src/ApiAuthError.ts
var ApiAuthError = class extends ApiError_default {
  constructor(message, code = 0, data = {}, guid = "") {
    super(message, code, data, guid);
  }
};
var ApiAuthError_default = ApiAuthError;

// src/ApiConfig.ts
var ApiConfig = class {
  baseUrl;
  baseUrlParams;
  useAuthentication;
  getAccessTokenFn;
  constructor(baseUrl, baseUrlParams, useAuthentication, getAccessTokenFn = async () => {
    return "";
  }) {
    this.baseUrl = baseUrl;
    this.baseUrlParams = baseUrlParams;
    this.useAuthentication = useAuthentication;
    this.getAccessTokenFn = getAccessTokenFn;
  }
};
var ApiConfig_default = ApiConfig;

// src/ApiRequestQueueItem.ts
var ApiRequestQueueItem = class {
  id;
  created;
  url;
  data;
  config;
  abortController;
  authentication;
  constructor(id = crypto.randomUUID(), url = "", data = null, config = {}, abortController = new AbortController(), authentication = true) {
    this.id = id;
    this.created = /* @__PURE__ */ new Date();
    this.url = url;
    this.data = data;
    this.authentication = authentication;
    this.config = config;
    this.abortController = abortController;
  }
};
var ApiRequestQueueItem_default = ApiRequestQueueItem;

// src/ApiAdvancedResponse.ts
var ApiAdvancedResponse = class {
  id;
  response;
  constructor(requestQueueItem, response) {
    this.id = requestQueueItem.id;
    this.response = response;
  }
};
var ApiAdvancedResponse_default = ApiAdvancedResponse;

// src/ApiService.ts
import { trimEnd, isArray } from "lodash";

// src/ApiFetchError.ts
var ApiError2 = class _ApiError extends Error {
  code = 0;
  data = {};
  request = void 0;
  response = void 0;
  guid = "";
  constructor(message, code = 0, request = void 0, response = void 0, data = {}, guid = "") {
    super(message);
    this.name = this.constructor.name;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, _ApiError);
    }
    this.code = code;
    this.data = data;
    this.request = request;
    this.response = response;
    this.guid = guid;
  }
};
var ApiFetchError_default = ApiError2;

// src/ApiService.ts
var ApiService = class {
  serviceId = "";
  config;
  requestsQueue = {};
  /**
   *
   * @param {ApiConfig} apiConfig
   */
  constructor(apiConfig) {
    this.serviceId = crypto.randomUUID();
    this.config = apiConfig;
    console.log("Constructed ApiService #" + this.serviceId + " for base url " + apiConfig.baseUrl);
  }
  createRequest = async (method, urlPath, data = null, options = {}, authentication = true) => {
    const fullUrl = this.buildUrl(urlPath);
    const abortController = new AbortController();
    const requestId = crypto.randomUUID();
    const config = await this.buildConfig(method, options, data, abortController, authentication, requestId);
    this.requestsQueue[requestId] = new ApiRequestQueueItem_default(requestId, fullUrl, data, config, abortController, authentication);
    return this.requestsQueue[requestId];
  };
  buildUrl(urlPath) {
    if (urlPath.substring(0, 4) === "http") {
      return urlPath;
    }
    let cleanUrlPath = urlPath.replace(/^\/+|\/+$/g, "");
    let append = "";
    if (this.config.baseUrlParams !== "") {
      append = "?";
      if (cleanUrlPath.indexOf("?") > -1) {
        append = "&";
      }
      append += this.config.baseUrlParams;
    }
    return trimEnd(this.config.baseUrl, "/") + "/" + cleanUrlPath + append;
  }
  buildConfig = async (method = "GET", options = {}, data = null, abortController = null, authentication = true, requestId = crypto.randomUUID()) => {
    let config = {
      ...options
    };
    config.method = method;
    if (abortController instanceof AbortController) {
      config.signal = abortController.signal;
    }
    if (config.headers == void 0) {
      config.headers = new Headers();
    } else if (!(config.headers instanceof Headers)) {
      const requestHeaders = new Headers();
      if (isArray(config.headers)) {
        for (let i = 0; i < config.headers.length; i++) {
          requestHeaders.set(config.headers[i][0], config.headers[i][1]);
        }
      } else {
        for (const key in config.headers) {
          requestHeaders.set(key, config.headers[key]);
        }
      }
      config.headers = requestHeaders;
    }
    config.headers.set("X-Request-Id", requestId);
    if (authentication) {
      let accessToken = await this.config.getAccessTokenFn();
      if (accessToken === "" || accessToken === null) {
        console.log("empty access token");
        throw new ApiAuthError_default("Authentication failed", 401);
      }
      config.headers.set("Authorization", "Bearer " + accessToken);
    }
    if (data instanceof FormData) {
      config.body = data;
    } else if (data !== null) {
      config.body = JSON.stringify(data);
    }
    return config;
  };
  /**
   * Standardize error reporting up the stack to our ApiError
   * @param {Error} e
   * @throws {Error|ApiAuthError|ApiError}
   */
  apiErrorCatch = async (e) => {
    console.log(e);
    const response = e?.response;
    const request = e?.request;
    if (e.code === "ERR_NETWORK") {
      throw new ApiError_default("Network connection problem", "1001");
    } else if (e.code === "ERR_CANCELED") {
      throw new ApiError_default("Request cancelled", "1000");
    }
    if (response) {
      if (response.headers && response.headers.get("Content-Type").includes("application/json")) {
        response.data = await response.json();
      }
    }
    if (response && response.data && response.data.message) {
      throw new ApiError_default(response.data.message, response.status, response.data);
    } else if (response && response.status) {
      throw new ApiError_default(e.message, response.status);
    } else if (request && response && request.responseType === "blob" && response.data instanceof Blob && response.data.type && response.data.type.toLowerCase().includes("json")) {
      let resolvedResponse = JSON.parse(await response.data.text());
      if (resolvedResponse.message && resolvedResponse.status && resolvedResponse.data) {
        throw new ApiError_default(resolvedResponse.message, resolvedResponse.status, resolvedResponse.data);
      } else if (resolvedResponse.message && resolvedResponse.data) {
        throw new ApiError_default(resolvedResponse.message, response.status, resolvedResponse.data);
      }
    }
    throw new ApiError_default("Unrecoverable error in local API service");
  };
  cancelRequests = async (requestIds = []) => {
    for (let i in requestIds) {
      let requestId = requestIds[i];
      if (this.requestsQueue[requestId]) {
        if (this.requestsQueue[requestId] && this.requestsQueue[requestId].abortController instanceof AbortController) {
          this.requestsQueue[requestId].abortController.abort();
        }
        delete this.requestsQueue[requestId];
      }
    }
  };
  cancelRequest = async (requestId = "") => {
    await this.cancelRequests([requestId]);
  };
  cancelAll = async () => {
    await this.cancelRequests(Object.keys(this.requestsQueue));
  };
  /**
   * @throws {Error|ApiAuthError|ApiError}
   */
  getAdv = async (url, options = {}, authentication = true) => {
    const requestQueueItem = await this.createRequest("GET", url, null, options, authentication);
    const request = new Request(requestQueueItem.url, requestQueueItem.config);
    const responsePromise = fetch(request).then((response) => {
      if (response.ok) {
        return response;
      } else {
        throw new ApiFetchError_default(response.status + " " + response.statusText, response.status, request, response, {}, "22914417719b4809826c9d014fd2a978");
      }
    }).catch(async (e) => {
      await this.apiErrorCatch(e);
      throw e;
    });
    return new ApiAdvancedResponse_default(requestQueueItem, responsePromise);
  };
  /**
   * @throws {Error|ApiAuthError|ApiError}
   */
  get = async (url, options = {}, authentication = true) => {
    const advResponse = await this.getAdv(url, options, authentication);
    return advResponse.response;
  };
  /**
   * @throws {Error|ApiAuthError|ApiError}
   */
  postAdv = async (url, data, options = {}, authentication = true) => {
    let requestQueueItem = await this.createRequest("POST", url, data, options, authentication);
    const request = new Request(requestQueueItem.url, requestQueueItem.config);
    const responsePromise = fetch(request).then((response) => {
      if (response.ok) {
        return response;
      } else {
        throw new ApiFetchError_default(response.status + " " + response.statusText, response.status, request, response, {}, "9517f34da9cc4930a5aa3c60fed3eb8e");
      }
    }).catch(async (e) => {
      await this.apiErrorCatch(e);
      throw e;
    });
    return new ApiAdvancedResponse_default(requestQueueItem, responsePromise);
  };
  /**
   * @throws {Error|ApiAuthError|ApiError}
   */
  post = async (url, data, options = {}, authentication = true) => {
    let advResponse = await this.postAdv(url, data, options, authentication);
    return advResponse.response;
  };
  /**
   * @throws {Error|ApiAuthError|ApiError}
   */
  postForm = async (url, data, options = {}, authentication = true) => {
    let requestQueueItem = await this.createRequest("POST", url, data, options, authentication);
    requestQueueItem.config.headers.set("Content-Type", "multipart/form-data");
    return fetch(requestQueueItem.url, requestQueueItem.config).catch(async (e) => {
      await this.apiErrorCatch(e);
      throw e;
    });
  };
  /**
   * @throws {Error|ApiAuthError|ApiError}
   */
  put = async (url, data, options = {}, authentication = true) => {
    let requestQueueItem = await this.createRequest("PUT", url, data, options, authentication);
    return fetch(requestQueueItem.url, requestQueueItem.config).catch(async (e) => {
      await this.apiErrorCatch(e);
      throw e;
    });
  };
  /**
   * @throws {Error|ApiAuthError|ApiError}
   */
  delete = async (url, options = {}, authentication = true) => {
    let requestQueueItem = await this.createRequest("DELETE", url, null, options, authentication);
    return fetch(requestQueueItem.url, requestQueueItem.config).catch(async (e) => {
      await this.apiErrorCatch(e);
      throw e;
    });
  };
  /**
   * @throws {Error|ApiAuthError|ApiError}
   */
  postDownload = async (url, data, options = {}, authentication = true) => {
    let requestQueueItem = await this.createRequest("POST", url, data, options, authentication);
    let response = await fetch(requestQueueItem.url, requestQueueItem.config).catch(async (e) => {
      await this.apiErrorCatch(e);
      throw e;
    });
    await this.doBrowserDownload(response);
  };
  /**
   * @throws {Error|ApiAuthError|ApiError}
   */
  getDownload = async (url, options = {}, authentication = true) => {
    let requestQueueItem = await this.createRequest("GET", url, null, options, authentication);
    let response = await fetch(requestQueueItem.url, requestQueueItem.config).catch(async (e) => {
      await this.apiErrorCatch(e);
      throw e;
    });
    await this.doBrowserDownload(response);
  };
  doBrowserDownload = async (response) => {
    const blobContent = await response.blob();
    let downloadUrl = window.URL.createObjectURL(blobContent);
    let link = document.createElement("a");
    link.href = downloadUrl;
    let fileName = "file";
    let headerValue = response.headers.get("content-disposition");
    if (headerValue) {
      let fileNameMatch = headerValue.match(/filename=(.+)/);
      if (fileNameMatch && fileNameMatch.length === 2) {
        fileName = fileNameMatch[1].replaceAll(/["']/gi, "");
      } else if (fileNameMatch && fileNameMatch.length === 1) {
        fileName = fileNameMatch[0].replaceAll(/["']/gi, "");
      }
    }
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };
  /**
   * @throws {Error|ApiAuthError|ApiError}
   */
  upload = async (url, files, options = {}, authentication = true) => {
    let formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append("file[" + i + "]", files[i]);
    }
    let requestQueueItem = await this.createRequest("POST", url, formData, options, authentication);
    return fetch(requestQueueItem.url, requestQueueItem.config).catch(async (e) => {
      await this.apiErrorCatch(e);
      throw e;
    });
  };
};
var ApiService_default = ApiService;
export {
  ApiAdvancedResponse_default as ApiAdvancedResponse,
  ApiAuthError_default as ApiAuthError,
  ApiConfig_default as ApiConfig,
  ApiError_default as ApiError,
  ApiRequestQueueItem_default as ApiRequestQueueItem,
  ApiService_default as default
};
//# sourceMappingURL=ApiService.mjs.map