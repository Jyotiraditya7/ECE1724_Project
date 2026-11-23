import WatchCard from "../components/WatchCard";
import WatchForm from "../components/WatchForm";
import { useNavigate, useParams } from "react-router";
import { useEffect, useState } from "react";
import type { Watch, WatchPayload} from "../types";

export default function Dashboard() {
	const params = useParams();
	const navigate = useNavigate();

	const [watches, setWatches] = useState<Watch[]>([]);
	const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

	useEffect(() => {
		async function loadWatches() {
			try {
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

	async function handleCreate(payload: WatchPayload) {
		try {
			const response = await fetch("/api/watches", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			})

			if (!response.ok) {
				throw new Error("Error creating watch");
			}
			const data = await response.json();
			setWatches((prev) => [...prev, data]);
			navigate(`/users/${params.id}/watches/${data.id}`);
		} catch {
      // TODO: Set message to "Error creating paper"
      // TODO: Return false
			return;
    }
	}

	async function handleDelete(id: number, ticker: string) {
		const ok = confirm(`Are you sure you want to delete this watch for ${ticker} stock?`);
		if (!ok) return;
		try {
			const response = await fetch(`/api/watches/${id}`, {
				method: "DELETE"
			});

			if (!response.ok) {
				throw new Error("Error deleting paper");
			}

			setWatches((prev) => prev.filter((item) => item.id !== id));
		} catch {
		  // TODO: Set message to "Error deleting paper"
		}
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
			{loading ? (
        <div><p>Loading StockWatches...</p></div>
      ) : loadError ? (
        <div><p>Error Loading StockWatches</p></div>
				) : watches.length == 0 ? (
					<div><p>No StockWatches Found</p></div>
      ) : (watches.map((watch) => (
				<WatchCard
					id={watch.id}
					ticker={watch.ticker}
					triggered={watch.gainNotified || watch.lossNotified}
					onView={()=>navigate(`/users/${params.id}/watches/${watch.id}`)}
					onDelete={handleDelete}
				/>
			)))}
			<WatchForm onSubmit={handleCreate}></WatchForm>
			<section>
				<button type='button' onClick={handleExport}>Download Portfolio</button>
				<button type='button' onClick={handleImport}>Upload Portfolio</button>
			</section>
			<button type='button' onClick={handleLogout}>Logout</button>
		</div>
	)
}
