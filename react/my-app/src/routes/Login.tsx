// This component serves as the login page. Users can sign into their dashboard, or create a new account

import { useState } from "react";
import LoginForm from "../components/LoginForm";
import type { User, LoginFormData } from "../types";
import { useNavigate } from "react-router";
import { Separator } from "../components/ui/separator";
import { Button } from "../components/ui/button";
import { headerClass, h1Class, formHeaderClass, clickableText, pageContainerClass } from "../lib/ui";

const TEMP_dummy_creds: User = {
	id: "demo-user",
	email: "abc@mail.com",
	password: "123abc"
}

export default function Login() {
	const navigate = useNavigate();
	const [createNew, setCreateNew] = useState(false);	// Is the user logging in, or creating a new account?
	const [message, setMessage] = useState<string | null>(null);
	const [error, setError] = useState(false);

	const msgStyle = {
		true: "text-red-600 hover:text-red-300 hover:border-red-500",
		false: "text-cyan-900"
	}

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
			setError(true);
			setMessage("Error: Please input a username");
			return;
    }
		if (form.email.trim().length == 0) {
			setError(true);
			setMessage("Error: Please input an email");
			return;
		}
		if (form.password.trim().length == 0) {
			setError(true);
			setMessage("Error: Please input a password");
			return;
		}
		if (createNew && !(form.password === form.confirmPass)) {
			setError(true);
			setMessage("Error: Password and Confirm Password do not match");
			return;
		}

		// Are we creating a new account or logging in?
		if (!createNew) {
			const login_result = await (TEMP_check_credentials(form));	// TODO: connect to auth
			if (login_result.error) {
				setError(true);
				setMessage(login_result.error);
			} else {
				setError(false);
				setMessage("Logging in...");
				navigate(`/users/${TEMP_dummy_creds.id}`)
			}
		} else {
			const create_acc_result = await (TEMP_create_new_acc(form)); // TODO: connect to auth/backend
			if (create_acc_result.error) {
				setError(true);
				setMessage(create_acc_result.error);
			} else {
				setError(false);
				setMessage("Creating Account...");
				navigate(`/users/${TEMP_dummy_creds.id}`)
			}
		}
	}

	return (
		<div className={pageContainerClass}>
			<header className={headerClass}>
				<h1 className={h1Class}>Stock Watch</h1>
			</header>
			<div className='lg:w-1/3 w-1/2 lg:mt-20 sm:mt-15 mt-0 px-5 pt-2 pb-3 border-3 rounded-lg bg-blue-200  border-cyan-900 '>
				<p className={formHeaderClass}>{createNew ? "Sign up for Stock Watch" : "Login to your account"}</p>
				<Separator className="bg-gray-400" />
				<LoginForm createNew={createNew} onSubmit={handleLogin} />
				<button type='button' className={clickableText} onClick={() => {
					setCreateNew(!createNew);
					setMessage(null);
				}}>{createNew ? "Return to Sign In" : "Create a New Account"}</button>
			</div>
			{message && <Button
					type='button'
					disabled={!error}
					className={`mt-3 p-2 border-2 rounded-full ${msgStyle[error?"true":"false"]} bg-gray-200  border-cyan-800 `}
					onClick={() => setMessage(null)}>
			{message}</Button>}
		</div>
	);
}
