import axios, { AxiosRequestConfig } from "axios";

export async function apiGet<T>(url: string, config?: AxiosRequestConfig) {
  const response = await axios.get<T>(url, config);
  return response.data;
}

export async function apiPost<TResponse, TPayload = unknown>(
  url: string,
  payload?: TPayload,
  config?: AxiosRequestConfig
) {
  const response = await axios.post<TResponse>(url, payload, config);
  return response.data;
}

export async function apiPut<TResponse, TPayload = unknown>(
  url: string,
  payload?: TPayload,
  config?: AxiosRequestConfig
) {
  const response = await axios.put<TResponse>(url, payload, config);
  return response.data;
}

export async function apiPatch<TResponse, TPayload = unknown>(
  url: string,
  payload?: TPayload,
  config?: AxiosRequestConfig
) {
  const response = await axios.patch<TResponse>(url, payload, config);
  return response.data;
}

export async function apiDelete<TResponse>(
  url: string,
  config?: AxiosRequestConfig
) {
  const response = await axios.delete<TResponse>(url, config);
  return response.data;
}
