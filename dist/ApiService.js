"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/ApiService.ts
var ApiService_exports = {};
__export(ApiService_exports, {
  ApiAdvancedResponse: () => ApiAdvancedResponse_default,
  ApiAuthError: () => ApiAuthError_default,
  ApiConfig: () => ApiConfig_default,
  ApiError: () => ApiError_default,
  ApiRequestQueueItem: () => ApiRequestQueueItem_default,
  default: () => ApiService_default
});
module.exports = __toCommonJS(ApiService_exports);

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
  axiosConfig;
  abortController;
  authentication;
  constructor(id = crypto.randomUUID(), url = "", data = null, axiosConfig = {}, abortController = new AbortController(), authentication = true) {
    this.id = id;
    this.created = /* @__PURE__ */ new Date();
    this.url = url;
    this.data = data;
    this.authentication = authentication;
    this.axiosConfig = axiosConfig;
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
var import_axios = __toESM(require("axios"));
var import_lodash = require("lodash");
var ApiService = class {
  serviceId = "";
  config;
  requestsQueue = {};
  axiosInstance;
  /**
   *
   * @param {ApiConfig} apiConfig
   */
  constructor(apiConfig) {
    this.serviceId = crypto.randomUUID();
    this.config = apiConfig;
    this.axiosInstance = import_axios.default.create();
    this.axiosInstance.interceptors.response.use((response) => {
      if (response.config?.headers?.["X-Request-Id"]) {
        delete this.requestsQueue[response.config?.headers?.["X-Request-Id"]];
      }
      return response;
    }, (error) => {
      if (error.response?.config?.headers?.["X-Request-Id"]) {
        delete this.requestsQueue[error.response?.config?.headers?.["X-Request-Id"]];
      }
      return Promise.reject(error);
    });
    console.log("Constructed ApiService #" + this.serviceId + " for base url " + apiConfig.baseUrl);
  }
  createRequest = async (urlPath, data = null, options = {}, authentication = true) => {
    const fullUrl = this.buildUrl(urlPath);
    const abortController = new AbortController();
    const requestId = crypto.randomUUID();
    const axiosConfig = await this.buildAxiosConfig(options, abortController, authentication, requestId);
    this.requestsQueue[requestId] = new ApiRequestQueueItem_default(requestId, fullUrl, data, axiosConfig, abortController, authentication);
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
    return (0, import_lodash.trimEnd)(this.config.baseUrl, "/") + "/" + cleanUrlPath + append;
  }
  buildAxiosConfig = async (options = {}, abortController = null, authentication = true, requestId = crypto.randomUUID()) => {
    let config = {
      ...options
    };
    if (abortController instanceof AbortController) {
      config.signal = abortController.signal;
    }
    if (typeof config.headers === "undefined") {
      config.headers = {};
    }
    config.headers["X-Request-Id"] = requestId;
    if (authentication) {
      let accessToken = await this.config.getAccessTokenFn();
      if (accessToken === "" || accessToken === null) {
        console.log("empty access token");
        throw new ApiAuthError_default("Authentication failed", 401);
      }
      if (typeof config.headers === "undefined") {
        config.headers = {};
      }
      config.headers["Authorization"] = "Bearer " + accessToken;
    }
    return config;
  };
  /**
   * Standardize error reporting up the stack to our ApiError
   * @param {Error} e
   * @throws {Error|ApiAuthError|ApiError}
   */
  apiErrorCatch = async (e) => {
    if (import_axios.default.isAxiosError(e)) {
      const response = e?.response;
      const request = e?.request;
      const config = e?.config;
      if (e.code === "ERR_NETWORK") {
        throw new ApiError_default("Network connection problem", "1001");
      } else if (e.code === "ERR_CANCELED") {
        throw new ApiError_default("Request cancelled", "1000");
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
    } else if (e instanceof Error) {
      throw e;
    }
    throw new ApiError_default("Unrecoverable error in local API service");
  };
  cancelRequest = async (requestId = "") => {
    await this.cancelRequests([requestId]);
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
  cancelAll = async () => {
    await this.cancelRequests(Object.keys(this.requestsQueue));
  };
  /**
   * @throws {Error|ApiAuthError|ApiError}
   */
  getAdv = async (url, options = {}, authentication = true) => {
    let requestQueueItem = await this.createRequest(url, null, options, authentication);
    let responsePromise = this.axiosInstance.get(requestQueueItem.url, requestQueueItem.axiosConfig).catch(async (e) => {
      await this.apiErrorCatch(e);
      throw e;
    });
    return new ApiAdvancedResponse_default(requestQueueItem, responsePromise);
  };
  /**
   * @throws {Error|ApiAuthError|ApiError}
   */
  get = async (url, options = {}, authentication = true) => {
    let advResponse = await this.getAdv(url, options, authentication);
    return advResponse.response;
  };
  /**
   * @throws {Error|ApiAuthError|ApiError}
   */
  postAdv = async (url, data, options = {}, authentication = true) => {
    let requestQueueItem = await this.createRequest(url, data, options, authentication);
    let responsePromise = this.axiosInstance.post(requestQueueItem.url, data, requestQueueItem.axiosConfig).catch(async (e) => {
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
    if ((0, import_lodash.isEmpty)(options.headers)) {
      options.headers = {};
    }
    options.headers["Content-Type"] = "multipart/form-data";
    let requestQueueItem = await this.createRequest(url, data, options, authentication);
    return this.axiosInstance.post(requestQueueItem.url, data, requestQueueItem.axiosConfig).catch(async (e) => {
      await this.apiErrorCatch(e);
      throw e;
    });
  };
  /**
   * @throws {Error|ApiAuthError|ApiError}
   */
  put = async (url, data, options = {}, authentication = true) => {
    let requestQueueItem = await this.createRequest(url, data, options, authentication);
    return this.axiosInstance.put(requestQueueItem.url, data, requestQueueItem.axiosConfig).catch(async (e) => {
      await this.apiErrorCatch(e);
      throw e;
    });
  };
  /**
   * @throws {Error|ApiAuthError|ApiError}
   */
  delete = async (url, options = {}, authentication = true) => {
    let requestQueueItem = await this.createRequest(url, null, options, authentication);
    return this.axiosInstance.delete(requestQueueItem.url, requestQueueItem.axiosConfig).catch(async (e) => {
      await this.apiErrorCatch(e);
      throw e;
    });
  };
  /**
   * @throws {Error|ApiAuthError|ApiError}
   */
  postDownload = async (url, data, options = {}, authentication = true) => {
    let fullOptions = {
      ...options,
      responseType: "blob"
    };
    let requestQueueItem = await this.createRequest(url, data, fullOptions, authentication);
    let response = await this.axiosInstance.post(requestQueueItem.url, data, requestQueueItem.axiosConfig).catch(async (e) => {
      await this.apiErrorCatch(e);
      throw e;
    });
    this.doBrowserDownload(response);
  };
  /**
   * @throws {Error|ApiAuthError|ApiError}
   */
  getDownload = async (url, options = {}, authentication = true) => {
    let fullOptions = {
      ...options,
      responseType: "blob"
    };
    let requestQueueItem = await this.createRequest(url, null, fullOptions, authentication);
    let response = await this.axiosInstance.get(requestQueueItem.url, requestQueueItem.axiosConfig).catch(async (e) => {
      await this.apiErrorCatch(e);
      throw e;
    });
    this.doBrowserDownload(response);
  };
  doBrowserDownload = (response) => {
    let downloadUrl = window.URL.createObjectURL(new Blob([response.data]));
    let link = document.createElement("a");
    link.href = downloadUrl;
    let fileName = "file";
    if (response.headers["content-disposition"]) {
      let fileNameMatch = response.headers["content-disposition"].match(/filename=(.+)/);
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
    let requestQueueItem = await this.createRequest(url, formData, options, authentication);
    return this.axiosInstance.post(requestQueueItem.url, formData, requestQueueItem.axiosConfig).catch(async (e) => {
      await this.apiErrorCatch(e);
      throw e;
    });
  };
};
var ApiService_default = ApiService;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ApiAdvancedResponse,
  ApiAuthError,
  ApiConfig,
  ApiError,
  ApiRequestQueueItem
});
//# sourceMappingURL=ApiService.js.map