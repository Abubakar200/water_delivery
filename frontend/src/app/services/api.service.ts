import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

const API_BASE_URL = '/api/v1';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  constructor(private readonly http: HttpClient) {}

  get<T>(path: string): Observable<T> {
    return this.http.get<T>(`${API_BASE_URL}${path}`);
  }

  post<T>(path: string, payload: unknown): Observable<T> {
    return this.http.post<T>(`${API_BASE_URL}${path}`, payload);
  }

  put<T>(path: string, payload: unknown): Observable<T> {
    return this.http.put<T>(`${API_BASE_URL}${path}`, payload);
  }

  delete<T>(path: string): Observable<T> {
    return this.http.delete<T>(`${API_BASE_URL}${path}`);
  }

  // Auth endpoints
  login(payload: { email: string; password: string }) {
    return this.post('/auth/login', payload);
  }

  register(payload: { name: string; email: string; password: string; organisationId: number; phone?: string }) {
    return this.post('/auth/register', payload);
  }

  selectOrganisation(payload: { tempToken: string; organisationId: number }) {
    return this.post('/auth/select-organisation', payload);
  }

  refreshToken(payload: { refreshToken: string }) {
    return this.post('/auth/refresh', payload);
  }

  logout() {
    return this.post('/auth/logout', {});
  }

  getProfile() {
    return this.get('/auth/me');
  }

  changePassword(payload: { currentPassword: string; newPassword: string }) {
    return this.put('/auth/change-password', payload);
  }

  // Organisation endpoints
  createOrganisation(payload: { name: string; slug: string; logo?: string; phone?: string; address?: string }) {
    return this.post('/organisations', payload);
  }

  getOrganisations() {
    return this.get('/organisations');
  }

  getOrganisation(id: number) {
    return this.get(`/organisations/${id}`);
  }

  updateOrganisation(id: number, payload: { name?: string; slug?: string; logo?: string; phone?: string; address?: string }) {
    return this.put(`/organisations/${id}`, payload);
  }

  deleteOrganisation(id: number) {
    return this.delete(`/organisations/${id}`);
  }

  // User endpoints
  getUsers() {
    return this.get('/users');
  }

  createUser(payload: { name: string; email: string; password: string; organisationId: number; phone?: string; role?: string }) {
    return this.post('/users', payload);
  }

  updateUser(id: number, payload: { name?: string; email?: string; phone?: string; role?: string }) {
    return this.put(`/users/${id}`, payload);
  }

  deleteUser(id: number) {
    return this.delete(`/users/${id}`);
  }
}
