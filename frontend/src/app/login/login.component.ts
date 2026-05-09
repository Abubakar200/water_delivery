import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { InputText } from 'primeng/inputtext';
import { Password } from 'primeng/password';
import { Button } from 'primeng/button';
import { Select } from 'primeng/select';
import { Card } from 'primeng/card';

import { ApiService } from '../services/api.service';

@Component({
  standalone: true,
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    InputText,
    Password,
    Button,
    Select,
    Card,
  ],
})
export class LoginComponent {
  loginForm: FormGroup;
  organisationForm: FormGroup;
  loading = false;
  error = '';
  success = '';
  step: 'login' | 'selectOrg' | 'done' = 'login';
  organisations: Array<{ id: number; name: string; slug: string; role: string }> = [];
  tempToken = '';

  constructor(private readonly fb: FormBuilder, private readonly api: ApiService) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
    });

    this.organisationForm = this.fb.group({
      organisationId: [null, Validators.required],
    });
  }

  get emailControl() {
    return this.loginForm.get('email');
  }

  get passwordControl() {
    return this.loginForm.get('password');
  }

  get organisationControl() {
    return this.organisationForm.get('organisationId');
  }

  submitLogin(): void {
    this.error = '';
    this.success = '';

    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.api.login(this.loginForm.value).subscribe({
      next: (response: any) => {
        this.loading = false;

        if (response.requiresOrgSelection) {
          this.organisations = response.organisations || [];
          this.tempToken = response.tempToken;
          this.step = 'selectOrg';
        } else {
          this.saveTokens(response);
          this.success = 'Login successful!';
          this.step = 'done';
        }
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.message || err?.message || 'Login failed. Please try again.';
      },
    });
  }

  submitOrganisation(): void {
    this.error = '';
    this.success = '';

    if (this.organisationForm.invalid) {
      this.organisationForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.api
      .selectOrganisation({
        tempToken: this.tempToken,
        organisationId: this.organisationForm.value.organisationId,
      })
      .subscribe({
        next: (response: any) => {
          this.loading = false;
          this.saveTokens(response);
          this.success = 'Organisation selected successfully!';
          this.step = 'done';
        },
        error: (err) => {
          this.loading = false;
          this.error = err?.error?.message || err?.message || 'Organisation selection failed.';
        },
      });
  }

  private saveTokens(response: any): void {
    if (response.accessToken) {
      localStorage.setItem('accessToken', response.accessToken);
    }
    if (response.refreshToken) {
      localStorage.setItem('refreshToken', response.refreshToken);
    }
  }
}
