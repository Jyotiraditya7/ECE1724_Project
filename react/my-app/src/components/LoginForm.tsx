// This component renders a form for creating or editing a paper.

import type { SubmitEvent } from "react";
import type { LoginFormData } from "../types";
import { useEffect, useState } from "react";

const empty_form: LoginFormData = {
	email: "",
	password: "",
	confirmPass: ""
}

type LoginFormProps = {
	createNew: boolean;
	onSubmit: (payload: LoginFormData) => Promise<boolean>;
}

export default function LoginForm({createNew, onSubmit }: LoginFormProps) {

	const [submitting, setSubmitting] = useState(false);// Prevent multiple form submissions
	const [form, setForm] = useState(empty_form);

	// Clear form when we switch between logging in and creating account
	useEffect(() => {
		function emptyForm() {
			setForm(empty_form);
		}
		emptyForm();
	}, [createNew]);

	// Disable form while calling onSubmit
	async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
		event.preventDefault();

		if (submitting) return;
		setSubmitting(true);
		try {
			onSubmit(form);
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<div>
			<form
	      noValidate
	      onSubmit={handleSubmit}
    	>
	      <div>
	        <label htmlFor="email">Email:</label>
	        <input
	          id="email"
	          name="email"
	          type="text"
	          value={form.email}
	          disabled={submitting}
	          onChange={(event) => {
						setForm({ ...form, email: event.target.value })
	          }}
	        />
	      </div>

	      <div>
	        <label htmlFor="password">Password:</label>
	        <input
	          id="password"
	          name="password"
	          type="text"
	          value={form.password}
	          disabled={submitting}
	          onChange={(event) => {
						setForm({...form, password: event.target.value})
	          }}
	        />
				</div>
				{createNew && <div>
			     <label htmlFor="confirm">Confirm Password:</label>
			     <input
			       id="confirm"
			       name="confirm"
			       type="text"
			       value={form.confirmPass}
			       disabled={submitting}
			       onChange={(event) => {
							setForm({...form, confirmPass: event.target.value})
			       }}
			     />
				</div>}
				<div>
	        <button type="submit" disabled={submitting}>
	          {createNew ? "Create New Account" : "Sign In"}
	        </button>
				</div>
	    </form>
		</div>
	);
}
