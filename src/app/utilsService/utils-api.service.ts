import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, map } from 'rxjs';
import { MoveFolderRequestSelection } from '../folderService/folder-api-request';
import { FolderResponse } from '../folderService/folder-api-response';
import { HandleError, HttpErrorHandler } from '../http-error-handler.service';
import { LoginApiService } from '../logicService/login-api.service';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class UtilsApiService {

  baseUrl:string = environment.apiUrl;
  updateInboxUrl = this.baseUrl + 'updateInbox';  // URL to web api
  updateFolderUrl = this.baseUrl + 'updateFolder';  // URL to web api
  subscribeFolderUrl = this.baseUrl + 'subscribeFolder';  // URL to web api
  subscribALLFoldersUrl  = this.baseUrl + 'subscribALLFolders';  // URL to web api
  getUserLanguageUrl = this.baseUrl + 'getUserLanguage';  // URL to web api
  getUnreadUrl  = this.baseUrl + 'getUnread';  // URL to web api
  getTrashNameUrl = this.baseUrl + 'getTrashName';  // URL to web api
  getTrashMessagesUrl  = this.baseUrl + 'getTrashMessages';  // URL to web api
  getTrashEmptyUrl = this.baseUrl + 'getTrashEmpty';  // URL to web api
  getSeparatorUrl  = this.baseUrl + 'getSeparator';  // URL to web api
  getMessageCountUrl = this.baseUrl + 'getMessageCount';  // URL to web api
  getInboxMessageCountUrl = this.baseUrl + 'getInboxMessageCount';  // URL to web api


  //heroesUrl = 'http://localhost:8096/api/salesman_chat';  // URL to web api
  private handleError!: HandleError;

 constructor(
    private http: HttpClient,
    private loginApiService: LoginApiService ,
    httpErrorHandler: HttpErrorHandler) {
    this.handleError = httpErrorHandler.createHandleError('FoldersApiService');
  }
  
  subscribeFolder(folderName: string ): Observable<string> {
	 const httpOptions = {
	  headers: new HttpHeaders({
	    'userName': this.loginApiService.getUserName(),
	     'jwtKey': this.loginApiService.getJwtKey()
	  }),
	   params: new HttpParams()
	   .append('folderName ', folderName )
	};  
	  
    return this.http.post<string>(this.subscribeFolderUrl, "" ,  httpOptions)
      .pipe(
		  //tap(_ => this.log(`updated hero `)),
       	  catchError(this.handleError<any>('subscribeFolder'))
      );
  }


 subscribALLFolders (): Observable<string> {
	 const httpOptions = {
	  headers: new HttpHeaders({
	    'userName': this.loginApiService.getUserName(),
	     'jwtKey': this.loginApiService.getJwtKey()
	  })
	};  
	  
    return this.http.post<string>(this.subscribALLFoldersUrl, "" ,  httpOptions)
      .pipe(
		  //tap(_ => this.log(`updated hero `)),
       	  catchError(this.handleError<any>('subscribALLFolders'))
      );
  }
  
  
  
   getUserLanguage (): Observable<string> {
	 const httpOptions = {
	  headers: new HttpHeaders({
	    'userName': this.loginApiService.getUserName(),
	     'jwtKey': this.loginApiService.getJwtKey()
	  })
	};  
	  
    return this.http.post<string>(this.getUserLanguageUrl,"" ,  httpOptions)
      .pipe(
		  //tap(_ => this.log(`updated hero `)),
       	  catchError(this.handleError<any>('getUserLanguage'))
      );
  }
  
  
  
  
   getUnread (): Observable<string> {
	 const httpOptions = {
	  headers: new HttpHeaders({
	    'userName': this.loginApiService.getUserName(),
	    'jwtKey': this.loginApiService.getJwtKey()
	  })

	};  
	  
    return this.http.post<string>(this.getUnreadUrl,"" ,  httpOptions)
      .pipe(
		  //tap(_ => this.log(`updated hero `)),
       	  catchError(this.handleError<any>('getUnread'))
      );
  }
  
  
  
  
   getTrashName(): Observable<string> {
	 const httpOptions = {
	  headers: new HttpHeaders({
	    'userName': this.loginApiService.getUserName(),
	      'jwtKey': this.loginApiService.getJwtKey()
	  })
	};  
	  
    return this.http.post<string>(this.getTrashNameUrl,"" ,  httpOptions)
      .pipe(
		  //tap(_ => this.log(`updated hero `)),
       	  catchError(this.handleError<any>('getTrashName'))
      );
  }
  
  
  
  
   getTrashMessages(): Observable<string> {
	 const httpOptions = {
	  headers: new HttpHeaders({
	    'userName': this.loginApiService.getUserName(),
	    'jwtKey': this.loginApiService.getJwtKey()
	  })

	};  
	  
    return this.http.post<string>(this.getTrashMessagesUrl,"" ,  httpOptions)
      .pipe(
		  //tap(_ => this.log(`updated hero `)),
       	  catchError(this.handleError<any>('getTrashMessages'))
      );
  }
  
  
  
   getTrashEmpty(): Observable<string> {
	 const httpOptions = {
	  headers: new HttpHeaders({
	    'userName': this.loginApiService.getUserName(),
	    'jwtKey': this.loginApiService.getJwtKey()
	  })
	};  
	  
    return this.http.post<string>(this.getTrashEmptyUrl,"" ,  httpOptions)
      .pipe(
		  //tap(_ => this.log(`updated hero `)),
       	  catchError(this.handleError<any>('getTrashEmpty'))
      );
  }
  
  
  
   getSeparator(): Observable<string> {
	 const httpOptions = {
	  headers: new HttpHeaders({
	    'userName': this.loginApiService.getUserName(),
	     'jwtKey': this.loginApiService.getJwtKey()
	  })

	};  
	  
    return this.http.post<string>(this.getSeparatorUrl,"" ,  httpOptions)
      .pipe(
		  //tap(_ => this.log(`updated hero `)),
       	  catchError(this.handleError<any>('getSeparator'))
      );
  }
  
  
  
   getInboxMessageCount(): Observable<string> {
	 const httpOptions = {
	  headers: new HttpHeaders({
	    'userName': this.loginApiService.getUserName(),
	    'jwtKey': this.loginApiService.getJwtKey()
	  })

	};  
	  
    return this.http.post<string>(this.getMessageCountUrl,"" ,  httpOptions)
      .pipe(
		  //tap(_ => this.log(`updated hero `)),
       	  catchError(this.handleError<any>('getInboxMessageCount'))
      );
  }
  

	getMessageCount(folderName:string ): Observable<string> {
	 const httpOptions = {
	  headers: new HttpHeaders({
	    'userName': this.loginApiService.getUserName(),
	     'jwtKey': this.loginApiService.getJwtKey()
	  })

	};  
	  
	  let params = new HttpParams();
      params = params.set('folder', folderName); 
	  
      return this.http.post<string>(this.getMessageCountUrl,params ,  httpOptions)
      .pipe(
		  //tap(_ => this.log(`updated hero `)),
       	  catchError(this.handleError<any>('getMessageCount'))
      );
  }

  
}
