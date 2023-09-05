class ApiRequestQueueItem {
	constructor( id=null, url='', data=null, axiosConfig=null, abortController=null, authentication=true ) {
		if(id===null) {
			this.id = crypto.randomUUID()
		}
		else {
			this.id=id
		}
		this.created = new Date()
		this.url = url
		this.data = data
		this.authentication = authentication
		this.axiosConfig = axiosConfig
		this.abortController = abortController
	}
}

export default ApiRequestQueueItem;
