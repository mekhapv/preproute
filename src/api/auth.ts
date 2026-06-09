import { apiClient } from './client'
import type { LoginRequest, LoginSuccessResponse } from '../types/auth'

export const login = async (payload: LoginRequest) => {
  const response = await apiClient.post<LoginSuccessResponse>('/auth/login', payload)
  return response.data
}
