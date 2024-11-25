import {cloneDeep, debounce, upperCase} from "lodash";
import ApiAdvancedResponse from "./ApiAdvancedResponse";
import ApiError from "./ApiError";
import ApiService from "./ApiService";
import {EntityTable} from "dexie";
import {Ref, ref} from "vue";

export class UiStateError {
    error: boolean = false;
    errorCode: string | number = '';
    errorMessage: string = '';

    reset: () => void = (): void => {
        this.error = false;
        this.errorCode = '';
        this.errorMessage = '';
    }
}

export class UiState {
    loading: boolean = false;
    loadDialog: boolean = false;
    loadingError: UiStateError = new UiStateError();
}

export interface IServerDataTableSortGroup {
    key: string,
    order?: boolean | 'asc' | 'desc'
}

export type TServerDataTableFilters = Record<string, string | string[] | undefined | null>

export interface IServerDataTableOptions {
    filters?: TServerDataTableFilters | undefined,
    page?: number | undefined,
    itemsPerPage?: number | undefined,
    sortBy?: IServerDataTableSortGroup[] | undefined,
    groupBy?: IServerDataTableSortGroup[] | undefined
}

export interface IServerDataTableIndex {
    ids: string[],
    totalItems: number
}


export class ServerDataTable<T extends { _id: string }> {
    //ui
    public ui: Ref<UiState> = ref(new UiState())

    //api/db
    private localStorageKey: string = ''
    private baseUrl: string = ''
    private appApiService: ApiService
    private table: EntityTable<T, '_id'>

    //table
    public itemsPerPage: Ref<number> = ref(100)
    public page: Ref<number> = ref(1)
    public totalItems: Ref<number> = ref(0)
    public sortBy: Ref<IServerDataTableSortGroup[]> = ref([])
    public groupBy: Ref<IServerDataTableSortGroup[]> = ref([])
    public filters: Ref<TServerDataTableFilters | undefined> = ref(undefined)

    private defaultItemsPerPage: number = 100
    private defaultPage: number = 1
    private defaultSortBy: IServerDataTableSortGroup[] = []
    private defaultGroupBy: IServerDataTableSortGroup[] = []
    private defaultFilters: TServerDataTableFilters | undefined = undefined

    //indexing
    private tableIndexes: Record<string, IServerDataTableIndex> = {}
    private currentTableIndexKey: string | undefined = undefined
    public currentItems: Ref<T[]> = ref([])

    /**
     *
     * @param id
     * @param baseUrl
     * @param appApiService
     * @param table
     * @param defaultOptions
     * @param loadFromStorage optional - false by default. If true, will load current values from storage if available and use the values from defaultOptions if not.
     */
    constructor(id: string, baseUrl: string, appApiService: ApiService, table: EntityTable<T, '_id'>, defaultOptions: IServerDataTableOptions | undefined = undefined, loadFromStorage: boolean = true) {
        this.ui = ref(new UiState())

        this.localStorageKey = upperCase(id)
        this.baseUrl = baseUrl
        this.appApiService = appApiService
        this.table = table

        if (defaultOptions && defaultOptions.sortBy) {
            this.defaultSortBy = cloneDeep(defaultOptions.sortBy)
        }
        if (defaultOptions && defaultOptions.groupBy) {
            this.defaultGroupBy = cloneDeep(defaultOptions.groupBy)
        }
        if (defaultOptions && defaultOptions.filters) {
            this.defaultFilters = cloneDeep(defaultOptions.filters)
        }
        if (defaultOptions && defaultOptions.itemsPerPage) {
            this.defaultItemsPerPage = defaultOptions.itemsPerPage
        }

        if (loadFromStorage && defaultOptions) {
            const optionsStr = localStorage.getItem(this.localStorageKey)
            if (optionsStr == null) {
                return
            }
            const storedOptions = JSON.parse(optionsStr)

            this.filters.value = storedOptions.filters ?? cloneDeep(this.defaultFilters)
            this.itemsPerPage.value = storedOptions.itemsPerPage ?? cloneDeep(this.defaultItemsPerPage)
            this.sortBy.value = storedOptions.sortBy ?? cloneDeep(this.defaultSortBy)
            this.groupBy.value = storedOptions.groupBy ?? cloneDeep(this.defaultGroupBy)
        } else {
            if (defaultOptions && defaultOptions.sortBy) {
                this.sortBy.value = defaultOptions.sortBy
            }
            if (defaultOptions && defaultOptions.groupBy) {
                this.groupBy.value = defaultOptions.groupBy
            }
            if (defaultOptions && defaultOptions.filters) {
                this.filters.value = cloneDeep(defaultOptions.filters)
            }
            if (defaultOptions && defaultOptions.itemsPerPage) {
                this.itemsPerPage.value = defaultOptions.itemsPerPage
            }
            if (defaultOptions && defaultOptions.page) {
                this.page.value = defaultOptions.page
            }
        }

        this.persistInStorage()

    }

    public log = (message: string): void => {
        console.log(this.baseUrl + ': ' + message)
    }

    public updateValues = async (options: IServerDataTableOptions) => {
        this.log('update table values')

        console.log(this.itemsPerPage.value)
        console.log(options)

        if (options.itemsPerPage) {
            this.log('items per page not equal')
            this.itemsPerPage.value = options.itemsPerPage
        }
        if (options.page) {
            this.log('page not equal')
            this.page.value = options.page
        }
        if (options.filters) {
            this.log('filters not equal')
            this.filters.value = cloneDeep(options.filters)
        }
        if (options.sortBy) {
            this.log('sort by not equal')
            this.sortBy.value = options.sortBy
        }
        if (options.groupBy) {
            this.log('group by not equal')
            this.groupBy.value = options.groupBy
        }

        this.persistInStorage()
        this.log('get - options not equal')
        await this.getForTable()
    }

    public updateValuesDebounced = debounce(this.updateValues, 1000)

    public getForTable = async (forceFromServer: boolean = false): Promise<Array<T>> => {
        //ui
        this.ui.value.loadingError.reset()
        this.ui.value.loading = true

        //create index key
        this.currentTableIndexKey = this.getUrl()
        const indexKey: string = this.currentTableIndexKey

        //return indexed items from db
        if (this.tableIndexes[indexKey]?.totalItems > 0 && !forceFromServer) {
            this.totalItems.value = this.tableIndexes[indexKey].totalItems
            this.currentItems.value = await this.table.where('_id').anyOf(this.tableIndexes[indexKey].ids).toArray()

            this.ui.value.loading = false

            return this.currentItems.value
        }

        //get from api
        //api get for table method
        try {
            this.log('get for table')
            const apiAdvResponse: ApiAdvancedResponse = await this.appApiService.getAdv(this.getUrl())

            this.log('await api response')
            const apiResponse = await apiAdvResponse.response

            this.log('parse api response')
            this.currentItems.value = await apiResponse.json()

            //store in db
            this.log('save items to db')

            this.table.bulkPut(cloneDeep(this.currentItems.value))

            //create index
            this.totalItems.value = parseInt(apiResponse.headers.get('x-total-count') ?? '0')
            const ids = []
            for (const objectIndex in this.currentItems.value) {
                ids.push(this.currentItems.value[objectIndex]._id)
            }
            this.tableIndexes[indexKey] = {
                ids: ids,
                totalItems: this.totalItems.value
            }

            //return Array<T>
            return this.currentItems.value
        } catch (e: unknown) {
            this.ui.value.loadingError.error = true
            if (e instanceof Error) {
                this.ui.value.loadingError.errorMessage = e.message
            }
            if (e instanceof ApiError) {
                this.ui.value.loadingError.errorCode = e.code ?? 500
            }
            throw e
        } finally {
            //ui
            this.ui.value.loading = false
        }

    }

    public updateFilters = async (filters: TServerDataTableFilters | undefined, runChangeIfNeeded: boolean = true, force: boolean = true) => {
        this.log('update filters')

        //let change = false
        const clonedNewFilters = cloneDeep(filters)

        //if (!isEqual(cloneDeep(this.filters.value), clonedNewFilters)) {
        this.page.value = 1
        this.totalItems.value = 0
        this.filters.value = clonedNewFilters
        this.persistInStorage()
        //change = true
        //}

        //if ((change && runChangeIfNeeded) || force) {
        //	console.log(cloneDeep(this.filters.value))
        await this.getForTable()
        //}
    }

    public updateFiltersDebounced = debounce(this.updateFilters, 1000)

    public reset = async (): Promise<void> => {
        this.page.value = this.defaultPage
        this.totalItems.value = 0
        this.filters.value = cloneDeep(this.defaultFilters)
        this.sortBy.value = cloneDeep(this.defaultSortBy)
        this.groupBy.value = cloneDeep(this.defaultGroupBy)
        this.itemsPerPage.value = this.defaultItemsPerPage
        await this.updateFilters(this.filters.value)
    }
    public resetFilters = async (): Promise<void> => {
        this.filters.value = cloneDeep(this.defaultFilters)
        await this.updateFilters(this.filters.value)
    }

    public getUrl = () => {
        const urlParts = []

        if (this.filters.value) {
            for (const key in this.filters.value) {
                if (this.filters.value[key] === null || this.filters.value[key] === undefined) {
                    continue;
                }

                if (Array.isArray(this.filters.value[key])) {
                    if (this.filters.value[key].length == 0) {
                        continue
                    }

                    // @ts-expect-error known to be safe
                    for (const i in this.filters[key]) {
                        if (this.filters.value[key] === null || this.filters.value[key] === undefined) {
                            continue;
                        }
                        // @ts-expect-error known to be safe
                        urlParts.push(key + '[]=' + this.filters.value[key][i])
                    }
                } else {
                    urlParts.push(key + '=' + this.filters.value[key])
                }
            }
        }

        if (this.groupBy.value) {
            for (const groupBy of this.groupBy.value) {
                urlParts.push('groupBy[]=' + groupBy.key + '|' + groupBy.order)
            }
        }

        if (this.sortBy.value) {
            for (const sortBy of this.sortBy.value) {
                urlParts.push('sortBy[]=' + sortBy.key + '|' + sortBy.order)
            }
        }

        const urlJoin = this.baseUrl.includes('?') ? '&' : '?';

        return this.baseUrl + urlJoin + 'limit=' + this.itemsPerPage.value + '&page=' + this.page.value + '&' + urlParts.join('&')
    }

    public getIndexKey = () => {
        return this.getUrl()
    }

    public resetIndexing = () => {
        this.tableIndexes = {}
        this.currentTableIndexKey = undefined
    }

    private persistInStorage = (): void => {
        const value = JSON.stringify({
            filters: this.filters.value,
            defaultFilters: this.defaultFilters,
            itemsPerPage: this.itemsPerPage.value,
            defaultItemsPerPage: this.defaultItemsPerPage,
            sortBy: this.sortBy.value,
            defaultSortBy: this.defaultSortBy,
            groupBy: this.groupBy.value,
            defaultGroupBy: this.defaultGroupBy,
        })
        localStorage.setItem(this.localStorageKey, value)
    }


}