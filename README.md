# Api Service

## Installation
`npm install @gcgov/apiservice`

## Example Usage
```js
//MyApiService.js
import {ApiService,ApiConfig} from "@gcgov/apiservice"

const config = new ApiConfig(
	'https://www.myapi.com/',      //base url for the api
	'XDEBUG_SESSION=PHPSTORM',     //url parameters to be added to every request
	true,                          //api requires authentication
	async () => {                  //method to get and auto refresh the api access token
		return await yourGetAccessTokenFn();
	}
)

class MyApiService extends ApiService {

	//add custom methods here, if required
    
}

export default new MyApiService( config )
```
