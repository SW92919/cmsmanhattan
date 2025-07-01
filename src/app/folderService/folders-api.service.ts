import { Injectable } from '@angular/core';
import { Observable, catchError } from 'rxjs';
import { HttpHeaders, HttpClient } from '@angular/common/http'
import { HandleError, HttpErrorHandler } from '../http-error-handler.service';
import { FolderResponse } from './folder-api-response';
import { CreateFolderRequest, DeleteFolderRequestSelection, MoveFolderRequestSelection } from './folder-api-request';
import { LoginApiService } from '../logicService/login-api.service';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class FoldersApiService {

 private baseUrl:string = environment.apiUrl;
 private moveFolderURL =  this.baseUrl + 'moveFolder';
 private allFolderLisUrl = this.baseUrl + 'getAllFolderList';  // URL to web api
 private deleteFolderUrl = this.baseUrl + 'deleteFolder';
 private createFolderUrl = this.baseUrl + 'createFolder' ;
 
  //heroesUrl = 'http://localhost:8096/api/salesman_chat';  // URL to web api
  private handleError!: HandleError;

 constructor(
    private http: HttpClient,
     private loginApiService: LoginApiService ,
    httpErrorHandler: HttpErrorHandler) {
    this.handleError = httpErrorHandler.createHandleError('FoldersApiService');
  }
  
   getAllFolderList(): Observable<FolderResponse[]> {

	 const  httpOptions = {
	 headers: new HttpHeaders({
		'userName': this.loginApiService.getUserName(),
	    'Content-Type':  'application/json',
	    'jwtKey': this.loginApiService.getJwtKey()
	  })
	};
    return this.http.post<FolderResponse[]>(this.allFolderLisUrl,"" , httpOptions)
      .pipe(
		  //tap(_ => this.log(`updated hero `)),
       	  catchError(this.handleError<any>('getAllFolderList'))
      );
  }
  
  
   moveFolder(moveFolderRequestSelection: MoveFolderRequestSelection  ): Observable<FolderResponse> {
	 const  httpOptions = {
	 headers: new HttpHeaders({
		'userName': this.loginApiService.getUserName(),
	    'Content-Type':  'application/json',
	    'jwtKey': this.loginApiService.getJwtKey()
	  })
	};
    return this.http.post<FolderResponse>(this.moveFolderURL, moveFolderRequestSelection ,httpOptions)
      .pipe(
		  //tap(_ => this.log(`updated hero `)),
       	  catchError(this.handleError<any>('moveFolder'))
      );
  }

   deleteFolder(deleteFolderRequestSelection: DeleteFolderRequestSelection): Observable<FolderResponse> {
	 const  httpOptions = {
	 headers: new HttpHeaders({
		'userName': this.loginApiService.getUserName(),
	    'Content-Type':  'application/json',
	     'jwtKey': this.loginApiService.getJwtKey()
	  })
	};	   
    return this.http.post<FolderResponse>(this.deleteFolderUrl, deleteFolderRequestSelection ,httpOptions)
      .pipe(
		  //tap(_ => this.log(`updated hero `)),
       	  catchError(this.handleError<any>('deleteFolder'))
      );
  }
  
   createFolder(createFolderRequest : CreateFolderRequest ): Observable<FolderResponse> {
	 const  httpOptions = {
	 headers: new HttpHeaders({
		  	'userName': this.loginApiService.getUserName(),
	    'Content-Type':  'application/json',
	     'jwtKey': this.loginApiService.getJwtKey()
	  })
	};	   
    return this.http.post<FolderResponse>(this.createFolderUrl, createFolderRequest , httpOptions)
      .pipe(
		  //tap(_ => this.log(`updated hero `)),
       	  catchError(this.handleError<any>('createFolder'))
      );
  }
  
}
