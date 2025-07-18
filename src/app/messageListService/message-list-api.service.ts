import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError } from 'rxjs';
import { HandleError, HttpErrorHandler } from '../http-error-handler.service';
import { LoginApiService } from '../logicService/login-api.service';
import {
  DeleteMessageRequest,
  MessageListRequest,
  MoveMessageRequest,
  SearchMessageRequest,
} from './message-list-api-request';
import {
  MessageListResponse,
  SearchMessageResponse,
} from './message-list-api-response';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class MessageListApiService {
  private baseUrl: string = environment.apiUrl;
  private setSortOrderUlr = this.baseUrl + 'setSortOrder';
  private searchMessagesUrl = this.baseUrl + 'searchMessages';
  private moveMessageUrl = this.baseUrl + 'moveMessage';
  private listMessagesUrl = this.baseUrl + 'listMessages';
  private deleteMessageUrl = this.baseUrl + 'deleteMessage';
  //heroesUrl = 'http://localhost:8096/api/salesman_chat';  // URL to web api
  private handleError!: HandleError;

  constructor(
    private http: HttpClient,
    private loginApiService: LoginApiService,
    httpErrorHandler: HttpErrorHandler
  ) {
    this.handleError = httpErrorHandler.createHandleError('ChatService');
  }

  searchMessages(
    searchMessageRequest: SearchMessageRequest
  ): Observable<SearchMessageResponse> {
    const httpOptions = {
      headers: new HttpHeaders({
        userName: this.loginApiService.getUserName(),
        'Content-Type': 'application/json',
        jwtKey: this.loginApiService.getJwtKey(),
      }),
    };
    return this.http
      .post<SearchMessageResponse>(
        this.searchMessagesUrl,
        searchMessageRequest,
        httpOptions
      )
      .pipe(
        //tap(_ => this.log(`updated hero `)),
        catchError(this.handleError<any>('searchMessages'))
      );
  }

  moveMessage(moveMessageRequest: MoveMessageRequest): Observable<string> {
    const httpOptions = {
      headers: new HttpHeaders({
        userName: this.loginApiService.getUserName(),
        'Content-Type': 'application/json',
        jwtKey: this.loginApiService.getJwtKey(),
      }),
    };
    return this.http
      .post<string>(this.moveMessageUrl, moveMessageRequest, httpOptions)
      .pipe(
        //tap(_ => this.log(`updated hero `)),
        catchError(this.handleError<any>('moveMessage'))
      );
  }

  listMessagesOld(
    messageListRequest: MessageListRequest
  ): Observable<MessageListResponse> {
    const httpOptions = {
      headers: new HttpHeaders({
        userName: this.loginApiService.getUserName(),
        'Content-Type': 'application/json',
        jwtKey: this.loginApiService.getJwtKey(),
      }),
    };
    return this.http
      .post<MessageListResponse>(
        this.listMessagesUrl,
        messageListRequest,
        httpOptions
      )
      .pipe(
        //tap(_ => this.log(`updated hero `)),
        catchError(this.handleError<any>('listMessages'))
      );
  }

  listMessages(
    messageListRequest: MessageListRequest
  ): Observable<MessageListResponse> {
    //   console.log('🔍 MessageListApi - listMessages called with request:', messageListRequest);
    const httpOptions = {
      headers: new HttpHeaders({
        userName: this.loginApiService.getUserName(),
        'Content-Type': 'application/json',
        jwtKey: this.loginApiService.getJwtKey(),
      }),
    };
    return this.http
      .post<MessageListResponse>(
        this.listMessagesUrl,
        messageListRequest,
        httpOptions
      )
      .pipe(
        //tap(_ => this.log(`updated hero `)),
        catchError(this.handleError<any>('listMessages'))
      );
  }

  deleteMessage(
    deleteMessageRequest: DeleteMessageRequest
  ): Observable<string> {
    const httpOptions = {
      headers: new HttpHeaders({
        userName: this.loginApiService.getUserName(),
        'Content-Type': 'application/json',
        jwtKey: this.loginApiService.getJwtKey(),
      }),
    };
    return this.http
      .post<string>(this.deleteMessageUrl, deleteMessageRequest, httpOptions)
      .pipe(
        //tap(_ => this.log(`updated hero `)),
        catchError(this.handleError<any>('deleteMessage'))
      );
  }
}
