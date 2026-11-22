// This component renders a form for creating or editing a paper.

import type { SubmitEvent } from "react";
import type { User, LoginFormData } from "../types";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";

const TEMP_dummy_creds: User = {
	id: -1,
	email: "abc@mail.com",
	password: "123abc"
}

const empty_form: LoginFormData = {
	email: "",
	password: "",
	confirmPass: ""
}

export default function LoginForm() {
	const navigate = useNavigate();

	const [createNew, setCreateNew] = useState(false);	// Is the user logging in, or creating a new account?
	const [submitting, setSubmitting] = useState(false);// Prevent multiple form submissions
	const [form, setForm] = useState(empty_form);

	// Dummy function for checking account credentials
	async function TEMP_check_credentials() {
		if (form.email === TEMP_dummy_creds.email && form.password == TEMP_dummy_creds.password) {
			navigate(`/users/${TEMP_dummy_creds.id}`);
		} else {
			return false;
		}
	}

	// Dummy function for seeing if account already exists and if password and confirm password form fields match
	async function TEMP_create_new_acc() {
		if (form.email === TEMP_dummy_creds.email) {
			return false;
		}
		if (form.password === form.confirmPass) {
			navigate(`/users/${TEMP_dummy_creds.id}`);
		} else {
			return false;
		}
	}

	async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
		event.preventDefault();

		if (submitting) return;
		setSubmitting(true);

		// Are we creating a new account or logging in?
		if (!createNew) {
			const login_success = await (TEMP_check_credentials());
			if (!login_success) {
				setSubmitting(false);
			}
		} else {
			const create_success = await (TEMP_create_new_acc());
			if (!create_success) {
				setSubmitting(false);
			}
		}
	}

	return (
		<div>
			<h2>{createNew ? "Create New Account" : "Sign In"}</h2>
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
				<div>
	        <button type="submit" disabled={submitting}>
	          {createNew ? "Create New Account" : "Sign In"}
	        </button>
				</div>

	      {/* TODO: Render validation error if present */}
	      {/*error && <div className="error">{error}</div>*/}
	    </form>
		</div>
	);
}
