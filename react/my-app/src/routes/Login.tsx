// This component serves as the login page. Users can sign into their dashboard, or create a new account

import { useEffect, useState } from "react";
import LoginForm from "../components/LoginForm";
//import PaperForm from "../components/PaperForm";
//import PaperList from "../components/PaperList";
//import styles from "../styles/Home.module.css";
//import type { Paper, PaperPayload, PapersListResponse } from "../types";

export default function Login() {
	return (
		<div>
			<h1>Money Watch</h1>
			<LoginForm/>
		</div>
	);
}
