// For GET API
export type User = {
	id: string;
	email: string;
	password: string;
}

export type Watch = {
	id: number;
	ticker: string;
	purchasePrice: number;
	gainPct: number;
	lossPct: number;
	gainNotified: boolean;
	lossNotified: boolean;
	createdAt: Date;
	updatedAt: Date;
	currentPrice: number;
	priceUpdatedAt: Date;
	changeAmount: number;
	changePct: number;
}

// For Frontend Form States
export type LoginFormData = {
	username: string;
	email: string;
	password: string;
	confirmPass: string;
}
