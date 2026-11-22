// This component serves as the login page. Users can sign into their dashboard, or create a new account

import { useState } from "react";
import LoginForm from "../components/LoginForm";
import type { User, LoginFormData } from "../types";
import { useNavigate } from "react-router";

const TEMP_dummy_creds: User = {
	id: "demo-user",
	email: "abc@mail.com",
	password: "123abc"
}

export default function Login() {
	const navigate = useNavigate();
	const [createNew, setCreateNew] = useState(false);	// Is the user logging in, or creating a new account?
	const [message, setMessage] = useState<string|null>(null);

	// Dummy function for checking account credentials
	async function TEMP_check_credentials(form: LoginFormData) {
		if (form.email === TEMP_dummy_creds.email && form.password == TEMP_dummy_creds.password) {
			return {error: null};
		} else {
			return {error: "Invalid Credentials"};
		}
	}

	// Dummy function for seeing if account already exists
	async function TEMP_create_new_acc(form: LoginFormData) {
		if (form.email === TEMP_dummy_creds.email) {
			return {error:"Error: Email already registered"};
		}
		if (form.username === TEMP_dummy_creds.id) {
			return {error: "Error: Username already registered"};
		}
		return { error: null };
	}

	async function handleLogin(form: LoginFormData) {
		// Validate form inputs
		if (createNew && form.username.trim().length == 0) {
			setMessage("Error: Please input a username");
    }
		if (form.email.trim().length == 0) {
			setMessage("Error: Please input an email");
		}
		if (form.password.trim().length == 0) {
			setMessage("Error: Please input a password");
		}
		if (createNew && !(form.password === form.confirmPass)) {
			setMessage("Error: Password and Confirm Password do not match");
    }

		// Are we creating a new account or logging in?
		if (!createNew) {
			const login_result = await (TEMP_check_credentials(form));	// TODO: connect to auth
			if (login_result.error) {
				setMessage(login_result.error);
			} else {
				setMessage("Logging in...");
				navigate(`/users/${TEMP_dummy_creds.id}`)
			}
		} else {
			const create_acc_result = await (TEMP_create_new_acc(form)); // TODO: connect to auth/backend
			if (create_acc_result.error) {
				setMessage(create_acc_result.error);
			} else {
				setMessage("Creating Account...");
				navigate(`/users/${TEMP_dummy_creds.id}`)
			}
		}
	}

	return (
		<div>
			<h1>Money Watch</h1>
			<h2>{createNew ? "Register for MoneyWatch" : "Sign In to MoneyWatch"}</h2>
			<LoginForm createNew={createNew} onSubmit={handleLogin} />
			<button type='button' onClick={() => {
				setCreateNew(!createNew);
				setMessage(null);
			}}>{createNew ? "Return to Sign In" : "Create a New Account"}</button>
			{message && <div>{message}</div>}
		</div>
	);
}
