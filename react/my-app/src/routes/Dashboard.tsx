import WatchCard from "../components/WatchCard";
import { useNavigate, useParams } from "react-router";

export default function Dashboard() {
	const params = useParams();
	const navigate = useNavigate();

	async function handleLogout() {
		navigate('/');
	}

	async function handleCreate() {
		navigate('/watches/-1');
	}

	async function handleExport() {
		return;
	}

	async function handleImport() {
		return;
	}

	return (
		<div>
			<h1>Money Watch</h1>
			<h2>{`Welcome Back ${params.id}`}</h2>
			<section>
				<button type='button' onClick={handleCreate}>Create New Watch</button>
				<button type='button' onClick={handleExport}>Download Portfolio</button>
				<button type='button' onClick={handleImport}>Upload Portfolio</button>
			</section>
			<button type='button' onClick={handleLogout}>Logout</button>
		</div>
	)
}
