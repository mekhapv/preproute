export type AuthUser = {
  id?: string
  userId?: string
  name?: string
  role?: string
  subrole?: string | null
  phone?: string
  joiningDate?: string
  endDate?: string
  lastActive?: string
  payment?: boolean
  [key: string]: unknown
}

export type LoginRequest = {
  userId: string
  password: string
}

export type LoginSuccessResponse = {
  status: string
  message: string
  data: {
    token: string
    user: AuthUser
  }
}
