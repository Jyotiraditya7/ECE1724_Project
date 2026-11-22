// This component renders a form for creating or editing a paper.

import type { SubmitEvent } from "react";
import type { WatchFormData, WatchPayload } from "../types";
import { useState } from "react";

const empty_form: WatchFormData = {
	ticker: "",
	purchasePrice: "",
	gainPct: "",
	lossPct: ""
}

type WatchFormProps = {
	onSubmit: (payload: WatchPayload) => void;
}

export default function LoginForm({onSubmit}: WatchFormProps) {

	const [submitting, setSubmitting] = useState(false);// Prevent multiple form submissions
	const [error, setError] = useState<string | null>(null);
	const [form, setForm] = useState(empty_form);

	// Disable form while calling onSubmit
	async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
		event.preventDefault();
		if (submitting) return;

		// Validate Form Inputs
		// ticker needs to be non-empty string
		if (form.ticker.trim().length == 0) {
			setError("Error: Please input a ticker");
			return;
		}

		// purchase price cannot have exponentials, must be positive, and less than 3 decimals
		if (form.purchasePrice.trim().length == 0) {
			setError("Error: Please input a purchasing price");
			return;
		}
		if (form.purchasePrice.includes('e')) {
			setError("Error: Please input a valid purchasing price (No Exponentials)");
			return;
		}
		if (form.purchasePrice.includes('.') && form.purchasePrice.split('.')[1].length > 2) {
			setError("Error: Please input a valid purchasing price (Too Many Decimals)");
			return;
		}
		if (Number(form.purchasePrice) <= 0) {
			setError("Error: Purchasing Price must be greater than 0");
			return;
		}

		// gain% cannot have exponentials and must be positive
		if (form.gainPct.trim().length == 0) {
			setError("Error: Please input a Gain Alert %");
			return;
		}
		if (form.gainPct.includes('e')) {
			setError("Error: Please input a valid Gain Alert % (No Exponentials");
			return;
		}
		if (Number(form.gainPct) <= 0) {
			setError("Error: Gain Alert % must be greater than 0");
			return;
		}

		// loss% cannot have exponentials and must be negative
		if (form.lossPct.trim().length == 0) {
			setError("Error: Please input a Loss Alert %");
			return;
		}
		if (form.lossPct.includes('e')) {
			setError("Error: Please input a valid Loss Alert % (No Exponentials");
			return;
		}
		if (Number(form.lossPct) >= 0) {
			setError("Error: Loss Alert % must be less than 0");
			return;
		}

		// Validation Passes, create payload
		const payload: WatchPayload = {
			ticker: form.ticker,
			purchasePrice: Number(form.purchasePrice),
			gainPct: Number(form.gainPct),
			lossPct: Number(form.lossPct)
		}


		setSubmitting(true);
		try {
			onSubmit(payload);
		} finally {
			setSubmitting(false);
			setError(null);
		}
	}

	return (
		<div>
			<div>Create New Stock Watch</div>
			<form
	      noValidate
	      onSubmit={handleSubmit}
    	>
	      <div>
					<div>
				     <label htmlFor="Ticker">Ticker:</label>
				     <input
				       id="ticker"
				       name="ticker"
				       type="text"
				       value={form.ticker}
				       disabled={submitting}
				       onChange={(event) => {
								setForm({...form, ticker: event.target.value})
				       }}
				     />
					</div>
	        <label htmlFor="purchasePrice">Purchasing Price:</label>
	        <input
	          id="purchasePrice"
	          name="purchasePrice"
	          type="number"
	          value={form.purchasePrice}
	          disabled={submitting}
	          onChange={(event) => {
						setForm({ ...form, purchasePrice: event.target.value })
	          }}
	        />
	      </div>

	      <div>
	        <label htmlFor="gainPct">Gain Alert %:</label>
	        <input
	          id="gainPct"
	          name="gainPct"
	          type="number"
	          value={form.gainPct}
	          disabled={submitting}
	          onChange={(event) => {
						setForm({...form, gainPct: event.target.value})
	          }}
	        />
				</div>
				<div>
			     <label htmlFor="lossPct">Loss Alert %:</label>
			     <input
			       id="lossPct"
			       name="lossPct"
			       type="number"
			       value={form.lossPct}
			       disabled={submitting}
			       onChange={(event) => {
							setForm({...form, lossPct: event.target.value})
			       }}
			     />
				</div>
				<div>
					<button type="submit" disabled={submitting}>Submit New StockWatch</button>
					<button type="button" disabled={submitting} onClick={() => {
						setForm(empty_form);
						setError(null);
					}}>Clear Form</button>
				</div>
			</form>
			{error && <p>{error}</p>}
		</div>
	);
}
