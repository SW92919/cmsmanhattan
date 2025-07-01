import { Component, inject } from '@angular/core';
import {  ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatRadioModule } from '@angular/material/radio';
import { MatCardModule } from '@angular/material/card';
import { LoginApiService } from '../logicService/login-api.service';
import { LoginResponse } from '../logicService/login-api-response';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    IonicModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatRadioModule,
    MatCardModule,
    ReactiveFormsModule
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
	message = "" ;
	private fb = inject(FormBuilder);
    addressForm: FormGroup = this.fb.group({
    userName: this.loginApiService.getUserName(),
    password: null
  });

  constructor(private loginApiService: LoginApiService , private router: Router) { }
  showPassword = false;
  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }
	onSubmit(): void {
	 let userName:string = this.addressForm.controls['userName'].value;
	 userName = userName.toLowerCase( )
	 const password:string = this.addressForm.controls['password'].value;
	 this.loginApiService.login(userName, password ).subscribe(loginResponse => {
      // console.log("login: " + loginResponse.message);
      //this.router.navigate(['/home']);
      if(loginResponse.message == "Success" ) 
      {
		  //this.router.navigateByUrl("(login:app)");
		  this.loginApiService.setJwtKey(loginResponse.jwtKey);
		  this.router.navigateByUrl("app");
      }
      else  this.message = "The login is fail check you user name and password then try again." ;
      });
  }
}
