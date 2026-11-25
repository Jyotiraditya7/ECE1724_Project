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
	const [locked, setLocked] = useState(false);	// Protect against race conditions


	// Load watches on page refresh
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
	}, [])

	// Live update watches every 10 seconds
	useEffect(() => {
		async function loadWatches() {
			if (locked) return;
			try {
				// Lock form submission while reading
				setLocked(true);
				const response = await fetch("/api/watches");

				if (!response.ok) {
					throw new Error("Error loading watches")
				}
				const data = await response.json();
				setWatches(data);
			} catch {
				setStatusMsg("Error updating watches");
			} finally {
				setLocked(false);
			}
		}

		const intervalId = setInterval(() => {
			loadWatches();
		}, 10000);
		return () => {
			clearInterval(intervalId);
		}
	}, [watches, locked]);

	async function handleLogout() {
		navigate('/');
	}

	async function handleCreate(payload: WatchPayload) {
		if (locked) return;
		try {
			setLocked(true);
			const response = await fetch("/api/watches", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			})

			if (!response.ok) {
				throw new Error("Error creating watch");
			}
			const data = await response.json();
			navigate(`/users/${params.id}/watches/${data.id}`);
		} catch {
			setStatusMsg("Error creating watch");
		} finally {
			setLocked(false);
		}
	}

	async function handleDelete(id: number, ticker: string) {
		if (locked) return;
		const ok = confirm(`Are you sure you want to delete this watch for ${ticker} stock?`);
		if (!ok) return;
		try {
			setLocked(true);
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
		} finally {
			setLocked(false);
		}
	}

	async function handleExport() {
		if (locked) return;
		return;
	}

	async function handleImport() {
		if (locked) return;
		return;
	}

	return (
		<div className={pageContainerClass}>
			<Banner/>
			<div className='flex-col justify-items-center lg:w-2/3 w-full px-5 py-3 space-y-6 border-3 rounded-lg bg-blue-200  border-cyan-900 '>
				<h2 className={h2Class}>{`Welcome Back ${params.id}`}</h2>
				{/*Non-Dismissable Status/Error messages + WatchCard list*/}
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
						locked={locked}
						onView={()=>navigate(`/users/${params.id}/watches/${watch.id}`)}
						onDelete={handleDelete}
					/>
				)))}
				{/*Upload/Download buttons*/}
				{!loadError &&	<ButtonGroup>
					<Button type='button' onClick={handleExport} disabled={locked} className={buttonClass}>Download Portfolio</Button>
						<Button type='button' onClick={handleImport} disabled={locked} className={buttonClass}>Upload Portfolio</Button>
				</ButtonGroup>}
				{/*Dismissable Status and Error messages*/}
				{!loadError && statusMsg && <Button
					type='button'
					onClick={() => setStatusMsg(null)}
					className={`p-2 border-2 rounded-full bg-gray-200  border-cyan-800 ${statusMsg.includes('Error') ? errStatusMsgClass : statusMsgClass}`}
				>
					{statusMsg}
				</Button>}
				{/*Create Watch Form*/}
				{!loadError && <WatchForm onSubmit={handleCreate} locked={locked}></WatchForm>}
				{/*Logout Button */}
				<Button type='button' onClick={handleLogout} className={buttonClass}>Logout</Button>
			</div>
		</div>
	)
}
