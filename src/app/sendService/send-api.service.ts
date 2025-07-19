import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError } from 'rxjs';
import { HandleError, HttpErrorHandler } from '../http-error-handler.service';
import { LoginApiService } from '../logicService/login-api.service';
import { MailMessageSendRequest } from './new-message-api-request';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class SendApiService {
  baseUrl: string = environment.apiUrl;
  setToUrl = this.baseUrl + 'setTo'; // URL to web api
  setSubjectUrl = this.baseUrl + 'setSubject'; // URL to web api
  setFromUrl = this.baseUrl + 'setFrom'; // URL to web api
  setForwardUrl = this.baseUrl + 'setForward'; // URL to web api
  setCcUrl = this.baseUrl + 'setCc'; // URL to web api
  setBodyUrl = this.baseUrl + 'setBody'; // URL to web api
  setBccUrl = this.baseUrl + 'setBcc'; // URL to web api
  setAutoSignUrl = this.baseUrl + 'setAutoSign'; // URL to web api
  setAttachmentUrl = this.baseUrl + 'setAttachment'; // URL to web api
  sendMailUrl = this.baseUrl + 'sendMail'; // URL to web api-ok
  sendMailBySessionModelUrl = this.baseUrl + 'sendMailBySessionModel'; // URL to web api
  getAttachmentUrl = this.baseUrl + 'getAttachment'; // URL to web api
  setRichTextUrl = this.baseUrl + 'setRichText'; // URL to web api
  setCidUrl = this.baseUrl + 'setCid'; // URL to web api
  //   /api/setHtmlMode, and /api/getForward   don't existing
  //heroesUrl = 'http://localhost:8096/api/salesman_chat';  // URL to web api
  private handleError!: HandleError;

  constructor(
    private http: HttpClient,
    private loginApiService: LoginApiService,
    httpErrorHandler: HttpErrorHandler
  ) {
    this.handleError = httpErrorHandler.createHandleError('SendApiService');
  }

  sendMail(mailMessageSendRequest: MailMessageSendRequest): Observable<string> {
    const httpOptions = {
      headers: new HttpHeaders({
        userName: this.loginApiService.getUserName(),
        jwtKey: this.loginApiService.getJwtKey(),
      }),
    };

    console.log(
      '🔍 SendApiService - sendMail called with request:',
      JSON.stringify(mailMessageSendRequest, null, 2)
    );
    console.log('🔍 SendApiService - URL:', this.sendMailUrl);
    console.log('🔍 SendApiService - Headers:', httpOptions.headers);

    return this.http
      .post<string>(this.sendMailUrl, mailMessageSendRequest, httpOptions)
      .pipe(
        //tap(_ => this.log(`updated hero `)),
        catchError(this.handleError<any>('sendMail'))
      );
  }

  setTo(to: string): Observable<string> {
    const httpOptions = {
      headers: new HttpHeaders({
        userName: this.loginApiService.getUserName(),
        jwtKey: this.loginApiService.getJwtKey(),
      }),
      params: new HttpParams().append('to', to),
    };

    return this.http.post<string>(this.setToUrl, '', httpOptions).pipe(
      //tap(_ => this.log(`updated hero `)),
      catchError(this.handleError<any>('setTo'))
    );
  }

  setSubject(subject: string): Observable<string> {
    const httpOptions = {
      headers: new HttpHeaders({
        userName: this.loginApiService.getUserName(),
        jwtKey: this.loginApiService.getJwtKey(),
      }),
      params: new HttpParams().append('subject', subject),
    };
    return this.http.post<string>(this.setSubjectUrl, '', httpOptions).pipe(
      //tap(_ => this.log(`updated hero `)),
      catchError(this.handleError<any>('setSubject'))
    );
  }

  setRichText(richText: string): Observable<string> {
    const httpOptions = {
      headers: new HttpHeaders({
        userName: this.loginApiService.getUserName(),
        jwtKey: this.loginApiService.getJwtKey(),
      }),
      params: new HttpParams().append('richText', richText),
    };

    return this.http.post<string>(this.setRichTextUrl, '', httpOptions).pipe(
      //tap(_ => this.log(`updated hero `)),
      catchError(this.handleError<any>('setRichText'))
    );
  }

  setFrom(from: string): Observable<string> {
    const httpOptions = {
      headers: new HttpHeaders({
        userName: this.loginApiService.getUserName(),
        jwtKey: this.loginApiService.getJwtKey(),
      }),
      params: new HttpParams().append('from', from),
    };
    return this.http.post<string>(this.setFromUrl, '', httpOptions).pipe(
      //tap(_ => this.log(`updated hero `)),
      catchError(this.handleError<any>('setFrom'))
    );
  }

  setForward(forward: string): Observable<string> {
    const httpOptions = {
      headers: new HttpHeaders({
        userName: this.loginApiService.getUserName(),
        jwtKey: this.loginApiService.getJwtKey(),
      }),
      params: new HttpParams().append('forward', forward),
    };

    return this.http.post<string>(this.setForwardUrl, '', httpOptions).pipe(
      //tap(_ => this.log(`updated hero `)),
      catchError(this.handleError<any>('setForward'))
    );
  }

  setCid(cid: string): Observable<string> {
    const httpOptions = {
      headers: new HttpHeaders({
        userName: this.loginApiService.getUserName(),
        jwtKey: this.loginApiService.getJwtKey(),
      }),
      params: new HttpParams().append('cid', cid),
    };

    return this.http.post<string>(this.setCidUrl, '', httpOptions).pipe(
      //tap(_ => this.log(`updated hero `)),
      catchError(this.handleError<any>('setCid'))
    );
  }

  setCc(cc: string): Observable<string> {
    const httpOptions = {
      headers: new HttpHeaders({
        userName: this.loginApiService.getUserName(),
        jwtKey: this.loginApiService.getJwtKey(),
      }),
      params: new HttpParams().append('cc', cc),
    };

    return this.http.post<string>(this.setCcUrl, '', httpOptions).pipe(
      //tap(_ => this.log(`updated hero `)),
      catchError(this.handleError<any>('setCc'))
    );
  }

  setBody(body: string): Observable<string> {
    const httpOptions = {
      headers: new HttpHeaders({
        userName: this.loginApiService.getUserName(),
        jwtKey: this.loginApiService.getJwtKey(),
      }),
      params: new HttpParams().append('body', body),
    };

    return this.http.post<string>(this.setBodyUrl, '', httpOptions).pipe(
      //tap(_ => this.log(`updated hero `)),
      catchError(this.handleError<any>('setBody'))
    );
  }

  setBcc(bcc: string): Observable<string> {
    const httpOptions = {
      headers: new HttpHeaders({
        userName: this.loginApiService.getUserName(),
        jwtKey: this.loginApiService.getJwtKey(),
      }),
      params: new HttpParams().append('bcc', bcc),
    };

    return this.http.post<string>(this.setBccUrl, '', httpOptions).pipe(
      //tap(_ => this.log(`updated hero `)),
      catchError(this.handleError<any>('setBcc'))
    );
  }

  setAutoSign(autoSign: string, userName: string): Observable<string> {
    const httpOptions = {
      headers: new HttpHeaders({
        userName: this.loginApiService.getUserName(),
        jwtKey: this.loginApiService.getJwtKey(),
      }),
      params: new HttpParams().append('autoSign', autoSign),
    };

    return this.http.post<string>(this.setAutoSignUrl, '', httpOptions).pipe(
      //tap(_ => this.log(`updated hero `)),
      catchError(this.handleError<any>('setAutoSign'))
    );
  }

  setAttachment(attachment: string): Observable<string> {
    const httpOptions = {
      headers: new HttpHeaders({
        userName: this.loginApiService.getUserName(),
        jwtKey: this.loginApiService.getJwtKey(),
      }),
      params: new HttpParams().append('attachment', attachment),
    };

    return this.http.post<string>(this.setAttachmentUrl, '', httpOptions).pipe(
      //tap(_ => this.log(`updated hero `)),
      catchError(this.handleError<any>('setAttachment'))
    );
  }

  sendMailBySessionModel(): Observable<string> {
    const httpOptions = {
      headers: new HttpHeaders({
        userName: this.loginApiService.getUserName(),
        jwtKey: this.loginApiService.getJwtKey(),
      }),
    };

    return this.http
      .post<string>(this.sendMailBySessionModelUrl, '', httpOptions)
      .pipe(
        //tap(_ => this.log(`updated hero `)),
        catchError(this.handleError<any>('sendMailBySessionModel'))
      );
  }

  getForward(forward: string, userName: string): Observable<string> {
    const httpOptions = {
      headers: new HttpHeaders({
        userName: this.loginApiService.getUserName(),
        jwtKey: this.loginApiService.getJwtKey(),
      }),
      params: new HttpParams().append('forward', forward),
    };

    return this.http.post<string>(this.setForwardUrl, '', httpOptions).pipe(
      //tap(_ => this.log(`updated hero `)),
      catchError(this.handleError<any>('getForward'))
    );
  }

  getAttachment(userName: string): Observable<string> {
    const httpOptions = {
      headers: new HttpHeaders({
        userName: this.loginApiService.getUserName(),
        jwtKey: this.loginApiService.getJwtKey(),
      }),
    };

    return this.http.post<string>(this.getAttachmentUrl, '', httpOptions).pipe(
      //tap(_ => this.log(`updated hero `)),
      catchError(this.handleError<any>('getAttachment'))
    );
  }
}
