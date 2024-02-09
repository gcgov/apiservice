class ApiConfig {
    public baseUrl:string
    public baseUrlParams:string
    public useAuthentication:boolean
    public getAccessTokenFn:()=>Promise<string>

	constructor( baseUrl:string, baseUrlParams:string, useAuthentication:boolean, getAccessTokenFn=async():Promise<string>=>{return ''} ) {
		this.baseUrl = baseUrl
		this.baseUrlParams = baseUrlParams
		this.useAuthentication = useAuthentication
		this.getAccessTokenFn = getAccessTokenFn //async function
	}
}
export default ApiConfig;
