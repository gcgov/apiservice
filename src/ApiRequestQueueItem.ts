import {AxiosRequestConfig} from "axios";

class ApiRequestQueueItem {
    public id: string
    public created: Date
    public url: string
    public data: any
    public axiosConfig: AxiosRequestConfig
    public abortController: AbortController
    public authentication: boolean


    constructor(
        id: string = crypto.randomUUID(),
        url: string = '',
        data: any = null,
        axiosConfig: AxiosRequestConfig = {},
        abortController: AbortController = new AbortController(),
        authentication: boolean = true
    ) {
        this.id = id
        this.created = new Date()
        this.url = url
        this.data = data
        this.authentication = authentication
        this.axiosConfig = axiosConfig
        this.abortController = abortController
    }
}

export default ApiRequestQueueItem;
