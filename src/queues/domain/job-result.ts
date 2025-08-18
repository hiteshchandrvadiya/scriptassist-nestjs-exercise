export interface JobResult {
  success: boolean;
  data?: any;
  error?: string;
  retryable?: boolean;
  message?: string;
}
