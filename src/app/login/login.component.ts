import { Component, inject, OnInit } from '@angular/core';
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
export class LoginComponent implements OnInit {
	message = "" ;
	private fb = inject(FormBuilder);
    addressForm: FormGroup = this.fb.group({
    userName: ['', Validators.required],
    password: ['', Validators.required],
    rememberMe: [false]
  });

  constructor(private loginApiService: LoginApiService , private router: Router) { }
  
  ngOnInit(): void {
    this.loadSavedCredentials();
  }
  
  showPassword = false;
  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }
  
  private loadSavedCredentials(): void {
    const savedCredentials = localStorage.getItem('savedCredentials');
    if (savedCredentials) {
      try {
        const credentials = JSON.parse(savedCredentials);
        this.addressForm.patchValue({
          userName: credentials.userName || '',
          password: credentials.password || '',
          rememberMe: true
        });
      } catch (error) {
        console.error('Error loading saved credentials:', error);
        // Clear corrupted data
        localStorage.removeItem('savedCredentials');
      }
    } else {
      // If no saved credentials, set default username from service
      this.addressForm.patchValue({
        userName: this.loginApiService.getUserName()
      });
    }
  }
  
  private saveCredentials(): void {
    const credentials = {
      userName: this.addressForm.get('userName')?.value,
      password: this.addressForm.get('password')?.value
    };
    localStorage.setItem('savedCredentials', JSON.stringify(credentials));
  }
  
  private clearSavedCredentials(): void {
    localStorage.removeItem('savedCredentials');
  }
	onSubmit(): void {
	 let userName:string = this.addressForm.controls['userName'].value;
	 userName = userName.toLowerCase( )
	 const password:string = this.addressForm.controls['password'].value;
	 const rememberMe:boolean = this.addressForm.controls['rememberMe'].value;
	 
	 this.loginApiService.login(userName, password ).subscribe(loginResponse => {
      // console.log("login: " + loginResponse.message);
      //this.router.navigate(['/home']);
      if(loginResponse.message == "Success" ) 
      {
		  //this.router.navigateByUrl("(login:app)");
		  this.loginApiService.setJwtKey(loginResponse.jwtKey);
		  
		  // Handle remember me functionality
		  if (rememberMe) {
		    this.saveCredentials();
		  } else {
		    this.clearSavedCredentials();
		  }
		  
		  this.router.navigateByUrl("app");
      }
      else  this.message = "The login is fail check you user name and password then try again." ;
      });
  }
}
