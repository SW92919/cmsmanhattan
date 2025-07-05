import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError } from 'rxjs';
import { HandleError, HttpErrorHandler } from '../http-error-handler.service';
import { LoginApiService } from '../logicService/login-api.service';
import { ForwardMessageContentRequest, MessageContentRequest } from './mail-message-api-request';
import { MessageContentResponse, StreamingResponseBody } from './mail-message-api-response';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class MessageDataApiService {

  baseUrl: string = environment.apiUrl;
  replyMessageUrl = this.baseUrl + 'getReplyMessage';
  messageUrl = this.baseUrl + 'getMessage';
  forwardMessageUrl = this.baseUrl + 'getForwardMessage';
  attachmentUrl = this.baseUrl + 'attachment';
  //heroesUrl = 'http://localhost:8096/api/salesman_chat';  // URL to web api
  private handleError!: HandleError;

  constructor(
    private http: HttpClient,
    private loginApiService: LoginApiService,
    httpErrorHandler: HttpErrorHandler) {
    this.handleError = httpErrorHandler.createHandleError('MessageDataApiService');
  }



  getReplyMessage(messageContentRequest: MessageContentRequest): Observable<MessageContentResponse> {
    const httpOptions = {
      headers: new HttpHeaders({
        'userName': this.loginApiService.getUserName(),
        'Content-Type': 'application/json',
        'jwtKey': this.loginApiService.getJwtKey()
      })
    };

    return this.http.post<MessageContentResponse>(this.replyMessageUrl, messageContentRequest, httpOptions)
      .pipe(
        //tap(_ => this.log(`updated hero `)),
        catchError(this.handleError<any>('getReplyMessage'))
      );
  }

  getMessage(messageContentRequest: MessageContentRequest): Observable<MessageContentResponse> {
    const httpOptions = {
      headers: new HttpHeaders({
        'userName': this.loginApiService.getUserName(),
        'Content-Type': 'application/json',
        'jwtKey': this.loginApiService.getJwtKey()
      })
    };

    return this.http.post<MessageContentResponse>(this.messageUrl, messageContentRequest, httpOptions)
      .pipe(
        //tap(_ => this.log(`updated hero `)),
        catchError(this.handleError<any>('getMessage'))
      );
  }

  getForwardMessage(forwardMessageContentRequest: ForwardMessageContentRequest): Observable<MessageContentResponse> {
    const httpOptions = {
      headers: new HttpHeaders({
        'userName': this.loginApiService.getUserName(),
        'Content-Type': 'application/json',
        'jwtKey': this.loginApiService.getJwtKey()
      })
    };

    return this.http.post<MessageContentResponse>(this.forwardMessageUrl, forwardMessageContentRequest, httpOptions)
      .pipe(
        //tap(_ => this.log(`updated hero `)),
        catchError(this.handleError<any>('getForwardMessage'))
      );
  }

  attachment(folder: string, messageNumber: number, filename: string, userName: string): Observable<Blob> {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'jwtKey': this.loginApiService.getJwtKey()
      }),
      params: new HttpParams()
        .append('folder', folder)
        .append('messageNumber', messageNumber)
        .append('filename', filename)
        .append('userName', userName),
      responseType: 'blob' as 'json'  // This is the key fix
    };

    return this.http.get<Blob>(this.attachmentUrl, httpOptions)
      .pipe(
        catchError(this.handleError<any>('attachment'))
      );
  }

}
