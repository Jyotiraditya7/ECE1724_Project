// For API
export type User = {
	id: number;
	email: string;
	password: string;
}

// For Frontend Form States
export type LoginFormData = {
	email: string;
	password: string;
	confirmPass: string;
}
