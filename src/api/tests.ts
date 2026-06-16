import { apiClient } from './client'

export type Subject = {
  id: string
  name: string
  created_at?: string
  updated_at?: string
}

export type Topic = {
  id: string
  name: string
  subject_id: string
}

export type SubTopic = {
  id: string
  name: string
  topic_id: string
}

export type TestPayload = {
  name: string
  type: string
  subject: string
  topics: string[]
  sub_topics: string[]
  correct_marks: number
  wrong_marks: number
  unattempt_marks: number
  difficulty: string
  total_time: number
  total_marks: number
  total_questions: number
  status: 'draft' | 'live' | 'unpublished' | 'scheduled' | 'expired'
}

export type TestDetails = {
  id: string
  name: string
  type?: string
  subject?: string
  topics?: string[]
  sub_topics?: string[]
  questions?: string[] | null
  correct_marks?: number
  unattempt_marks?: number
  wrong_marks?: number
  difficulty?: string
  total_marks?: number
  total_time?: number
  total_questions?: number
  slot?: string | null
  hidden_from_moderator?: boolean | null
  created_by?: number
  created_at?: string
  updated_by?: number | null
  updated_at?: string | null
  paragraph_question?: unknown
  status?: string | null
  scheduled_date?: string | null
  expiry_date?: string | null
  original_files?: unknown[]
}

export type UpdateTestPayload = Partial<TestPayload> & {
  name: string
  questions: string[]
  total_questions: number
  total_marks: number
}

export type BulkQuestionPayload = {
  questions: Array<{
    type: 'mcq'
    question: string
    option1: string
    option2: string
    option3: string
    option4: string
    correct_option: 'option1' | 'option2' | 'option3' | 'option4'
    explanation: string
    difficulty: string
    test_id: string
    subject: string
  }>
}

export type QuestionInput = BulkQuestionPayload['questions'][number]

export type CreatedQuestion = QuestionInput & {
  id: string
}

export type BulkFetchedQuestion = {
  id: string
  type: 'mcq'
  question: string
  option1: string
  option2: string
  option3: string
  option4: string
  correct_option: 'option1' | 'option2' | 'option3' | 'option4'
  explanation: string
  difficulty: string
  test_id: string
}

export type TestListItem = {
  id: string
  name: string
  type?: string
  subject?: string
  topics?: string[]
  sub_topics?: string[]
  questions?: string[] | null
  correct_marks?: number
  unattempt_marks?: number
  wrong_marks?: number
  difficulty?: string
  total_marks?: number
  total_time?: number
  total_questions?: number
  slot?: string | null
  hidden_from_moderator?: boolean | null
  created_by?: number
  created_at?: string
  updated_by?: number | null
  updated_at?: string | null
  paragraph_question?: unknown
  status?: string | null
  scheduled_date?: string | null
  expiry_date?: string | null
}

type ApiStatusListResponse<T> = {
  status: string
  message: string
  data: T[]
}

type ApiStatusItemResponse<T> = {
  status: string
  message: string
  data: T
}

export const getSubjects = async () => {
  const response = await apiClient.get<ApiStatusListResponse<Subject>>('/subjects')
  return response.data.status === 'success' ? response.data.data : []
}

export const getTopicsBySubject = async (subjectId: string) => {
  if (!subjectId) return []
  const response = await apiClient.get<ApiStatusListResponse<Topic>>(`/topics/subject/${subjectId}`)
  return response.data.status === 'success' ? response.data.data : []
}

export const getSubTopicsByTopic = async (topicId: string) => {
  if (!topicId) return []
  const response = await apiClient.get<ApiStatusListResponse<SubTopic>>(`/sub-topics/topic/${topicId}`)
  return response.data.status === 'success' ? response.data.data : []
}

export const getSubTopicsByTopics = async (topicIds: string[]) => {
  const validTopicIds = topicIds.filter(Boolean)
  if (validTopicIds.length === 0) return []
  const response = await apiClient.post<ApiStatusListResponse<SubTopic>>('/sub-topics/multi-topics', {
    topicIds: validTopicIds,
  })
  return response.data.status === 'success' ? response.data.data : []
}

export const createTest = async (payload: TestPayload) => {
  const response = await apiClient.post<ApiStatusItemResponse<{ id: string } & TestPayload>>('/tests', payload)
  return response.data
}

export const getTestById = async (testId: string) => {
  const response = await apiClient.get<ApiStatusItemResponse<TestDetails>>(`/tests/${testId}`)
  return response.data
}

export const updateTest = async (testId: string, payload: UpdateTestPayload) => {
  const response = await apiClient.put<ApiStatusItemResponse<{ id: string } & UpdateTestPayload>>(
    `/tests/${testId}`,
    payload,
  )
  return response.data
}

export const bulkCreateQuestions = async (payload: BulkQuestionPayload) => {
  const response = await apiClient.post<ApiStatusListResponse<CreatedQuestion>>(
    '/questions/bulk',
    payload,
  )
  return response.data
}

export const fetchBulkQuestions = async (questionIds: string[]) => {
  const validQuestionIds = questionIds.filter(Boolean)
  if (validQuestionIds.length === 0) {
    return []
  }
  const response = await apiClient.post<ApiStatusListResponse<BulkFetchedQuestion>>('/questions/fetchBulk', {
    question_ids: validQuestionIds,
  })
  return response.data.status === 'success' ? response.data.data : []
}

export const publishTest = async (testId: string) => {
  const response = await apiClient.put<ApiStatusItemResponse<TestDetails>>(
    `/tests/${testId}`,
    { status: 'live' },
  )
  return response.data
}

export const getTests = async (): Promise<TestListItem[]> => {
  const response = await apiClient.get<ApiStatusListResponse<TestListItem>>('/tests')
  return response.data.status === 'success' ? response.data.data : []
}

export const deleteTest = async (testId: string): Promise<void> => {
  await apiClient.delete(`/tests/${testId}`)
}
