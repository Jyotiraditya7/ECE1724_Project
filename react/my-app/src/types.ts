// For API
export type User = {
	id: string;
	email: string;
	password: string;
}

export type Watch = {
	id: number;
	ticker: string;
	purchasePrice: number;
	currPrice: number;
	updateTime: Date;
	gainPct: number;
	lossPct: number;
	triggered: boolean;
	user_id: string;
}

export type Stock = {
}

// For Frontend Form States
export type LoginFormData = {
	email: string;
	password: string;
	confirmPass: string;
}
