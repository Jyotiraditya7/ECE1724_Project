import WatchCard from "../components/WatchCard";
import { useNavigate, useParams } from "react-router";
import { useEffect, useState } from "react";
import type { Watch } from "../types";

export default function Dashboard() {
	const params = useParams();
	const navigate = useNavigate();

	const [watches, setWatches] = useState<Watch[]>([]);
	const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

	useEffect(() => {
		async function loadWatches() {
			try {
				// TODO: Fetch papers from GET /api/papers
				// TODO: If response is not ok, throw an Error
				// TODO: Parse JSON as PapersListResponse
				// TODO: Set papers state using data.papers
				const response = await fetch("/api/watches");

				if (!response.ok) {
					throw new Error("Error loading watches")
				}
				const data = await response.json();
				setWatches(data);
			} catch {
				// TODO: Set loadError to true
				setLoadError(true);
			} finally {
				// TODO: Set loading to false
				setLoading(false);
			}
		}
		loadWatches();
	}, []);


	async function handleLogout() {
		navigate('/');
	}

	async function handleCreate() {
		navigate(`/users/${params.id}/watches/-1`);
	}

	async function handleEdit(id: number) {
		navigate(`/users/${params.id}/watches/${id}`);
	}

	async function handleDelete(id: number, ticker: string) {
		const ok = confirm(`Are you sure you want to delete this watch for ${ticker} stock?`);
		if (!ok) return;
		/*
		try {
			const response = await fetch(`/api/papers/${paper.id}`, {
				method: "DELETE"
			});

			if (!response.ok) {
				throw new Error("Error deleting paper");
			}

			setPapers((prev) => prev.filter((item) => item.id !== paper.id));
			setMessage("Paper deleted successfully");
		} catch {
		  // TODO: Set message to "Error deleting paper"
			setMessage("Error deleting paper");
		}
		*/
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
			{watches.map((watch) => (
				<WatchCard id={watch.id} ticker={watch.ticker} triggered={ watch.gainNotified || watch.lossNotified} onView={handleEdit} onDelete={handleDelete}></WatchCard>
			))}
			<section>
				<button type='button' onClick={handleCreate}>Create New Watch</button>
				<button type='button' onClick={handleExport}>Download Portfolio</button>
				<button type='button' onClick={handleImport}>Upload Portfolio</button>
			</section>
			<button type='button' onClick={handleLogout}>Logout</button>
		</div>
	)
}
