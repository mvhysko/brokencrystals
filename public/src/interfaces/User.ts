export interface LoginUser {
  user: string;
  password: string;
  csrf?: string;
  op?: LoginFormMode;
  fingerprint?: string;
}

export enum LoginFormMode {
  BASIC = 'basic',
  HTML = 'html',
  CSRF = 'csrf',
  DOM_BASED_CSRF = 'csrf_dom'
}

export interface LoginResponse {
  email: string;
  ldapProfileLink: string;
}

export interface RegistrationUser {
  email: string;
  lastName: string;
  firstName: string;
  password?: string;
}
