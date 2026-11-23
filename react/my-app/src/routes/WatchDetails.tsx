import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import type { Watch, WatchPayload} from "../types";
import WatchForm from "../components/WatchForm";

// This will all be fetched from backend using Watch id number passed in as route param
const empty_watch: Watch = {
	id: -1,
	ticker: "XYZ",
	purchasePrice: 0,
	gainPct:0,
	lossPct:0,
	gainNotified: false,
	lossNotified: false,
	createdAt: "",
	updatedAt: "",
	currentPrice: 0,
	priceUpdatedAt: "",
	changeAmount: 0,
	changePct: 0
}

export default function WatchDetails() {
	const params = useParams();
	const navigate = useNavigate();

	const [watch, setWatch] = useState(empty_watch);
	const [loading, setLoading] = useState(true);
	const [loadError, setLoadError] = useState(false);

	useEffect(() => {
		async function loadWatch() {
			try {
				const response = await fetch(`/api/watches/${params.watchid}`);

				if (!response.ok) {
					throw new Error("Error loading watches");
				}
				const data = await response.json();
				setWatch(data);
			} catch {
				// TODO: Set loadError to true
				setLoadError(true);
			} finally {
				// TODO: Set loading to false
				setLoading(false);
			}
		}
		loadWatch();
	}, [params.watchid]);

	async function handleSubmit(payload: WatchPayload) {
		try {
			const response = await fetch(`/api/watches/${params.watchid}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			})

			if (!response.ok) {
				throw new Error("Error updating watch");
			}
			navigate(`/users/${params.userid}`);
		} catch {
      // TODO: Set message to "Error creating paper"
      // TODO: Return false
			return;
    }
	}

	async function handleNotifReset() {
		// Send a copy of the watch as a WatchPayload to trigger alert reset
		const payload: WatchPayload = { ticker: watch.ticker, purchasePrice: watch.purchasePrice, gainPct: watch.gainPct, lossPct: watch.lossPct };

		try {
			const response = await fetch(`/api/watches/${params.watchid}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			})
			if (!response.ok) {
				throw new Error("Error updating watch");
			}
			const data = await response.json();
			setWatch(data);

		} catch {
      // TODO: Set message to "Error creating paper"
      // TODO: Return false
			return;
    }
	}

	return (
		<div>
			<h1>Money Watch</h1>
			{loading ? (
				<div>Loading StockWatch...</div>
			) : loadError ? (
				<div>Error Loading StockWatch</div>
			) : (
				<div>
					<h2>{`${watch.ticker} Stock Watch Summary`}</h2>
					<table>
						<tr>
							<th>Purchased Price</th>
							<th>Current Price</th>
							{<th>Last Updated</th>}
							<th>Gain Alert Status</th>
							<th>Loss Alert Status</th>
							<th>Reset Alerts</th>
						</tr>
						<tr>
							<td>{watch.purchasePrice}</td>
							<td>{!watch.currentPrice ? "N/A" : watch.currentPrice}</td>
							<td>{!watch.currentPrice ? "N/A" : new Date(watch.priceUpdatedAt).toLocaleDateString()}</td>
							<td>{watch.gainNotified ? "Triggered" : "Live"}</td>
							<td>{watch.lossNotified ? "Triggered" : "Live"}</td>
							<td><button onClick={()=>handleNotifReset()}>Reset</button></td>
						</tr>
					</table>
					<WatchForm
						watch={{
							ticker: watch.ticker,
							purchasePrice: watch.purchasePrice.toString(),
							gainPct: watch.gainPct.toString(),
							lossPct: watch.lossPct.toString()
						}}
					onSubmit={handleSubmit} />
				</div>
			)}
			<button type='button' onClick={() => navigate(`/users/${params.userid}`)}>Back</button>
		</div>
	);
}
