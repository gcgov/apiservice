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
import { isArray, trimEnd } from "lodash";

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

// src/ApiServerDataTable.ts
import { cloneDeep, debounce, upperCase } from "lodash";
import { ref } from "vue";
var UiStateError = class {
  error = false;
  errorCode = "";
  errorMessage = "";
  reset = () => {
    this.error = false;
    this.errorCode = "";
    this.errorMessage = "";
  };
};
var UiState = class {
  loading = false;
  loadDialog = false;
  loadingError = new UiStateError();
};
var ServerDataTable = class {
  //ui
  ui = ref(new UiState());
  //api/db
  localStorageKey = "";
  baseUrl = "";
  appApiService;
  table;
  //table
  itemsPerPage = ref(100);
  page = ref(1);
  totalItems = ref(0);
  sortBy = ref([]);
  groupBy = ref([]);
  filters = ref(void 0);
  defaultItemsPerPage = 100;
  defaultPage = 1;
  defaultSortBy = [];
  defaultGroupBy = [];
  defaultFilters = void 0;
  //indexing
  tableIndexes = {};
  currentTableIndexKey = void 0;
  currentItems = ref([]);
  /**
   *
   * @param id
   * @param baseUrl
   * @param appApiService
   * @param table
   * @param defaultOptions
   * @param loadFromStorage optional - false by default. If true, will load current values from storage if available and use the values from defaultOptions if not.
   */
  constructor(id, baseUrl, appApiService, table, defaultOptions = void 0, loadFromStorage = true) {
    this.ui = ref(new UiState());
    this.localStorageKey = upperCase(id);
    this.baseUrl = baseUrl;
    this.appApiService = appApiService;
    this.table = table;
    if (defaultOptions && defaultOptions.sortBy) {
      this.defaultSortBy = cloneDeep(defaultOptions.sortBy);
    }
    if (defaultOptions && defaultOptions.groupBy) {
      this.defaultGroupBy = cloneDeep(defaultOptions.groupBy);
    }
    if (defaultOptions && defaultOptions.filters) {
      this.defaultFilters = cloneDeep(defaultOptions.filters);
    }
    if (defaultOptions && defaultOptions.itemsPerPage) {
      this.defaultItemsPerPage = defaultOptions.itemsPerPage;
    }
    if (loadFromStorage && defaultOptions) {
      const optionsStr = localStorage.getItem(this.localStorageKey);
      if (optionsStr == null) {
        return;
      }
      const storedOptions = JSON.parse(optionsStr);
      this.filters.value = storedOptions.filters ?? cloneDeep(this.defaultFilters);
      this.itemsPerPage.value = storedOptions.itemsPerPage ?? cloneDeep(this.defaultItemsPerPage);
      this.sortBy.value = storedOptions.sortBy ?? cloneDeep(this.defaultSortBy);
      this.groupBy.value = storedOptions.groupBy ?? cloneDeep(this.defaultGroupBy);
    } else {
      if (defaultOptions && defaultOptions.sortBy) {
        this.sortBy.value = defaultOptions.sortBy;
      }
      if (defaultOptions && defaultOptions.groupBy) {
        this.groupBy.value = defaultOptions.groupBy;
      }
      if (defaultOptions && defaultOptions.filters) {
        this.filters.value = cloneDeep(defaultOptions.filters);
      }
      if (defaultOptions && defaultOptions.itemsPerPage) {
        this.itemsPerPage.value = defaultOptions.itemsPerPage;
      }
      if (defaultOptions && defaultOptions.page) {
        this.page.value = defaultOptions.page;
      }
    }
    this.persistInStorage();
  }
  log = (message) => {
    console.log(this.baseUrl + ": " + message);
  };
  updateValues = async (options) => {
    this.log("update table values");
    console.log(this.itemsPerPage.value);
    console.log(options);
    if (options.itemsPerPage) {
      this.log("items per page not equal");
      this.itemsPerPage.value = options.itemsPerPage;
    }
    if (options.page) {
      this.log("page not equal");
      this.page.value = options.page;
    }
    if (options.filters) {
      this.log("filters not equal");
      this.filters.value = cloneDeep(options.filters);
    }
    if (options.sortBy) {
      this.log("sort by not equal");
      this.sortBy.value = options.sortBy;
    }
    if (options.groupBy) {
      this.log("group by not equal");
      this.groupBy.value = options.groupBy;
    }
    this.persistInStorage();
    this.log("get - options not equal");
    await this.getForTable();
  };
  updateValuesDebounced = debounce(this.updateValues, 1e3);
  getForTable = async (forceFromServer = false) => {
    this.ui.value.loadingError.reset();
    this.ui.value.loading = true;
    this.currentTableIndexKey = this.getUrl();
    const indexKey = this.currentTableIndexKey;
    if (this.tableIndexes[indexKey]?.totalItems > 0 && !forceFromServer) {
      this.totalItems.value = this.tableIndexes[indexKey].totalItems;
      this.currentItems.value = await this.table.where("_id").anyOf(this.tableIndexes[indexKey].ids).toArray();
      this.ui.value.loading = false;
      return this.currentItems.value;
    }
    try {
      this.log("get for table");
      const apiAdvResponse = await this.appApiService.getAdv(this.getUrl());
      this.log("await api response");
      const apiResponse = await apiAdvResponse.response;
      this.log("parse api response");
      this.currentItems.value = await apiResponse.json();
      this.log("save items to db");
      this.table.bulkPut(cloneDeep(this.currentItems.value));
      this.totalItems.value = parseInt(apiResponse.headers.get("x-total-count") ?? "0");
      const ids = [];
      for (const objectIndex in this.currentItems.value) {
        ids.push(this.currentItems.value[objectIndex]._id);
      }
      this.tableIndexes[indexKey] = {
        ids,
        totalItems: this.totalItems.value
      };
      return this.currentItems.value;
    } catch (e) {
      this.ui.value.loadingError.error = true;
      if (e instanceof Error) {
        this.ui.value.loadingError.errorMessage = e.message;
      }
      if (e instanceof ApiError_default) {
        this.ui.value.loadingError.errorCode = e.code ?? 500;
      }
      throw e;
    } finally {
      this.ui.value.loading = false;
    }
  };
  updateFilters = async (filters, runChangeIfNeeded = true, force = true) => {
    this.log("update filters");
    const clonedNewFilters = cloneDeep(filters);
    this.page.value = 1;
    this.totalItems.value = 0;
    this.filters.value = clonedNewFilters;
    this.persistInStorage();
    await this.getForTable();
  };
  updateFiltersDebounced = debounce(this.updateFilters, 1e3);
  reset = async () => {
    this.page.value = this.defaultPage;
    this.totalItems.value = 0;
    this.filters.value = cloneDeep(this.defaultFilters);
    this.sortBy.value = cloneDeep(this.defaultSortBy);
    this.groupBy.value = cloneDeep(this.defaultGroupBy);
    this.itemsPerPage.value = this.defaultItemsPerPage;
    await this.updateFilters(this.filters.value);
  };
  resetFilters = async () => {
    this.filters.value = cloneDeep(this.defaultFilters);
    await this.updateFilters(this.filters.value);
  };
  getUrl = () => {
    const urlParts = [];
    if (this.filters.value) {
      for (const key in this.filters.value) {
        if (this.filters.value[key] === null || this.filters.value[key] === void 0) {
          continue;
        }
        if (Array.isArray(this.filters.value[key])) {
          if (this.filters.value[key].length == 0) {
            continue;
          }
          for (const i in this.filters[key]) {
            if (this.filters.value[key] === null || this.filters.value[key] === void 0) {
              continue;
            }
            urlParts.push(key + "[]=" + this.filters.value[key][i]);
          }
        } else {
          urlParts.push(key + "=" + this.filters.value[key]);
        }
      }
    }
    if (this.groupBy.value) {
      for (const groupBy of this.groupBy.value) {
        urlParts.push("groupBy[]=" + groupBy.key + "|" + groupBy.order);
      }
    }
    if (this.sortBy.value) {
      for (const sortBy of this.sortBy.value) {
        urlParts.push("sortBy[]=" + sortBy.key + "|" + sortBy.order);
      }
    }
    const urlJoin = this.baseUrl.includes("?") ? "&" : "?";
    return this.baseUrl + urlJoin + "limit=" + this.itemsPerPage.value + "&page=" + this.page.value + "&" + urlParts.join("&");
  };
  getIndexKey = () => {
    return this.getUrl();
  };
  resetIndexing = () => {
    this.tableIndexes = {};
    this.currentTableIndexKey = void 0;
  };
  persistInStorage = () => {
    const value = JSON.stringify({
      filters: this.filters.value,
      defaultFilters: this.defaultFilters,
      itemsPerPage: this.itemsPerPage.value,
      defaultItemsPerPage: this.defaultItemsPerPage,
      sortBy: this.sortBy.value,
      defaultSortBy: this.defaultSortBy,
      groupBy: this.groupBy.value,
      defaultGroupBy: this.defaultGroupBy
    });
    localStorage.setItem(this.localStorageKey, value);
  };
};

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
  getAllPaged = async (url, options = {}, authentication = true, page = 1, itemsPerPage = 100, collection = []) => {
    const advResponse = await this.getAdv(url, options, authentication);
    const apiResponse = await advResponse.response;
    const apiResponseData = await apiResponse.json();
    const pageCount = parseInt(apiResponse.headers.get("X-Page-Count") ?? "0");
    collection.push(...apiResponseData);
    if (pageCount > page) {
      return await this.getAllPaged(url, options, authentication, page + 1, itemsPerPage, collection);
    }
    return collection;
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
  ServerDataTable,
  ApiService_default as default
};
//# sourceMappingURL=ApiService.mjs.map