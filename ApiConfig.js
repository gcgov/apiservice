class ApiConfig {
	constructor( baseUrl, baseUrlParams, useAuthentication, getAccessTokenFn=async()=>{} ) {
		this.baseUrl = baseUrl
		this.baseUrlParams = baseUrlParams
		this.useAuthentication = useAuthentication //bool
		this.getBearerTokenFn = getAccessTokenFn //async function
	}
}
export default ApiConfig;
