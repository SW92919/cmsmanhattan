import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError} from 'rxjs';
import { HandleError, HttpErrorHandler } from '../http-error-handler.service';
import { LoginResponse } from './login-api-response';
import { environment } from '../../environments/environment';


@Injectable({
	providedIn: 'root'
})
export class LoginApiService {

	//baseUrl:string = 'http://localhost:8099/api/';
	//loginUrl = this.baseUrl + 'login';  // URL to web api
	//loginUrl =  'http://localhost:80/api/auth/login';  // URL to web api
	loginUrl = environment.apiUrl + 'auth/login';  // URL to web api
	logoutUrl = environment.apiUrl + 'auth/logout';  // URL to web api
	private handleError!: HandleError;

	constructor(
		private http: HttpClient,
		httpErrorHandler: HttpErrorHandler) {
		this.handleError = httpErrorHandler.createHandleError('LoginApiService');
	}


	login(userName:string , password:string ): Observable<LoginResponse> {
	  const httpOptions = {
	  headers: new HttpHeaders({
		'userName': userName,
		'password': password,
	    'jwtKey': ''
	  })
	  };  

	  this.setUserName(userName) ;
	  return this.http.post<LoginResponse>(this.loginUrl,"", httpOptions)
			.pipe(
				//tap(_ => this.log(`updated hero `)),
				catchError(this.handleError<any>('login'))
			);
	}

	
	logout(): Observable<LoginResponse> {
	  const httpOptions = {
	  headers: new HttpHeaders({
		'userName': this.getUserName(),
	    'Authorization': this.getJwtKey()
	  })
	  };  

	  this.removeUserName(this.getUserName()) ;
	  return this.http.post<LoginResponse>(this.logoutUrl, "" ,httpOptions)
			.pipe(

				//tap(_ => this.log(`updated hero `)),
				catchError(this.handleError<any>('logout'))
			);
	}


    getJwtKey(): string {
		return <string>sessionStorage.getItem('jwtKey');
	}

	setJwtKey(jwtKey: string) {
		sessionStorage.setItem('jwtKey', jwtKey);
	}


	getUserName(): string {
		return <string>sessionStorage.getItem('userName');
	}

	setUserName(userName: string) {
		sessionStorage.setItem('userName', userName);
	}


	removeUserName(userName: string) {
		sessionStorage.removeItem('userName');
	}

	deleteAllUsers() {
		sessionStorage.clear();
	}
}
