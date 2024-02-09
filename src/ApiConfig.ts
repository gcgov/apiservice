class ApiConfig {
    public baseUrl:string
    public baseUrlParams:string
    public useAuthentication:boolean
    public getAccessTokenFn:Function

	constructor( baseUrl:string, baseUrlParams:string, useAuthentication:boolean, getAccessTokenFn=async()=>{} ) {
		this.baseUrl = baseUrl
		this.baseUrlParams = baseUrlParams
		this.useAuthentication = useAuthentication //bool
		this.getAccessTokenFn = getAccessTokenFn //async function
	}
}
export default ApiConfig;
