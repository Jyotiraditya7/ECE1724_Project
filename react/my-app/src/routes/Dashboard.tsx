import WatchCard from "../components/WatchCard";
import WatchForm from "../components/WatchForm";
import Banner from "../components/Banner";
import { useNavigate, useParams } from "react-router";
import { useEffect, useState } from "react";
import type { Watch, WatchPayload} from "../types";
import { ButtonGroup } from "../components/ui/button-group";
import { Button } from "../components/ui/button";
import { pageContainerClass, errorMsgClass, msgClass, buttonClass, h2Class, errStatusMsgClass, statusMsgClass } from "../lib/ui";

export default function Dashboard() {
	const params = useParams();
	const navigate = useNavigate();

	const [watches, setWatches] = useState<Watch[]>([]);
	const [loading, setLoading] = useState(true);
	const [loadError, setLoadError] = useState(false);
	const [statusMsg, setStatusMsg] = useState<string | null>(null);

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
				setLoadError(true);
			} finally {
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
			setStatusMsg("Error creating watch");
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
			setStatusMsg(`Deleted watch for ${ticker} stock`);
		} catch {
			setStatusMsg("Error deleting watch");
		}
	}

	async function handleExport() {
		return;
	}

	async function handleImport() {
		return;
	}

	return (
		<div className={pageContainerClass}>
			<Banner/>
			<div className='flex-col justify-items-center lg:w-2/3 w-full px-5 py-3 space-y-6 border-3 rounded-lg bg-blue-200  border-cyan-900 '>
				<h2 className={h2Class}>{`Welcome Back ${params.id}`}</h2>
				{!loadError && statusMsg && <Button
					type='button'
					onClick={() => setStatusMsg(null)}
					className={`p-2 border-2 rounded-full bg-gray-200  border-cyan-800 ${statusMsg.includes('Error') ? errStatusMsgClass : statusMsgClass}`}
				>
					{statusMsg}
				</Button>}
				{loading ? (
					<div className={msgClass}>Loading StockWatches...</div>
	      ) : loadError ? (
	        <div className={errorMsgClass}>Error Loading StockWatches</div>
					) : watches.length == 0 ? (
						<div className={msgClass}>No StockWatches Found</div>
	      ) : (watches.map((watch) => (
					<WatchCard
						id={watch.id}
						ticker={watch.ticker}
						triggered={watch.gainNotified || watch.lossNotified}
						changePct={watch.changePct}
						onView={()=>navigate(`/users/${params.id}/watches/${watch.id}`)}
						onDelete={handleDelete}
					/>
				)))}
				{!loadError &&	<ButtonGroup>
						<Button type='button' onClick={handleExport} className={buttonClass}>Download Portfolio</Button>
						<Button type='button' onClick={handleImport} className={buttonClass}>Upload Portfolio</Button>
				</ButtonGroup>}
				{!loadError &&	<WatchForm onSubmit={handleCreate}></WatchForm>}
				<Button type='button' onClick={handleLogout} className={buttonClass}>Logout</Button>
			</div>
		</div>
	)
}
