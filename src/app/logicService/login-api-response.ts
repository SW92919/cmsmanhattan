export interface LoginResponse {
	"message": string,
 	"code": string,
  	"error": string,
  	"jwtKey": string
}

export const loginResponse: LoginResponse = {
  "message": "",
  "code": "",
  "error": "",
  "jwtKey": ""
};
