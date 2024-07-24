import {AxiosRequestConfig} from "axios";

class ApiRequestQueueItem {
    public id: string
    public created: Date
    public url: string
    public data: any
    public config: RequestInit
    public abortController: AbortController
    public authentication: boolean


    constructor(
        id: string = crypto.randomUUID(),
        url: string = '',
        data: any = null,
        config: RequestInit = {},
        abortController: AbortController = new AbortController(),
        authentication: boolean = true
    ) {
        this.id = id
        this.created = new Date()
        this.url = url
        this.data = data
        this.authentication = authentication
        this.config = config
        this.abortController = abortController
    }
}

export default ApiRequestQueueItem;
